import React from 'react';
import { ASTNode } from '../engine/types';
import { useGameStore } from '../state/useGameStore';
import { StackedFraction } from './StackedFraction';
import { GroupingView } from './GroupingView';
import { getPeelableNodes } from '../engine/validator';

export interface ASTNodeViewProps {
  node: ASTNode;
  onNodeClick: (nodeId: string) => void;
}

export const ASTNodeView: React.FC<ASTNodeViewProps> = ({ node, onNodeClick }) => {
  const equation = useGameStore(state => state.equation);
  const activeSelectedNodeId = useGameStore(state => state.activeSelectedNodeId);
  const shakeNodeId = useGameStore(state => state.shakeNodeId);

  // Compute if this node is peelable
  let isPeelable = false;
  if (equation && !equation.isSolved) {
    const peelableList = getPeelableNodes(equation.lhs, equation.targetVariable);
    isPeelable = peelableList.some(p => p.nodeId === node.id);
  }

  const isSelected = activeSelectedNodeId === node.id;
  const isShaking = shakeNodeId === node.id;

  // Handle Fraction Nodes
  if (node.type === 'fraction') {
    return (
      <StackedFraction
        nodeId={node.id}
        numeratorNode={node.numerator!}
        denominatorNode={node.denominator!}
        onNodeClick={onNodeClick}
        isPeelable={isPeelable}
      />
    );
  }

  // Handle Group Nodes (), {}, []
  if (node.type === 'group') {
    return (
      <GroupingView
        node={node}
        bracketType={node.bracketType || 'round'}
        onNodeClick={onNodeClick}
      />
    );
  }

  // Handle Unary Negation
  if (node.type === 'unary') {
    return (
      <span className="inline-flex items-center" data-node-id={node.id} data-node-type="unary">
        <span className="text-slate-800 font-bold mx-0.5">-</span>
        {node.operand && <ASTNodeView node={node.operand} onNodeClick={onNodeClick} />}
      </span>
    );
  }

  // Handle Binary Operations (+, -, *, /)
  if (node.type === 'binary') {
    return (
      <div
        className="inline-flex items-center mx-0.5"
        data-node-id={node.id}
        data-node-type="binary"
      >
        {node.left && <ASTNodeView node={node.left} onNodeClick={onNodeClick} />}

        {/* Operator Symbol */}
        <span
          className={`mx-1 text-slate-700 font-bold select-none ${
            node.op === '*' && node.implicit ? 'hidden' : 'inline-block'
          }`}
        >
          {node.op === '*' ? '·' : node.op === '/' ? '÷' : node.op}
        </span>

        {node.right && <ASTNodeView node={node.right} onNodeClick={onNodeClick} />}
      </div>
    );
  }

  // Leaf Nodes: Constant or Variable
  const baseClasses =
    'relative inline-flex items-center justify-center px-2 py-0.5 rounded-xl cursor-pointer select-none transition-all duration-200';

  let stateClasses = 'hover:bg-slate-100 text-slate-800 font-semibold';

  if (isPeelable) {
    stateClasses =
      'bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-400 shadow-sm shadow-emerald-200/50 hover:scale-105 hover:bg-emerald-100/90 animate-pulse-subtle';
  }

  if (isSelected) {
    stateClasses =
      'bg-indigo-50 text-indigo-950 font-bold ring-4 ring-indigo-500 shadow-md scale-105';
  }

  if (isShaking) {
    stateClasses =
      'bg-rose-50 text-rose-950 font-bold ring-2 ring-rose-500 animate-shake';
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNodeClick(node.id);
  };

  // Variable Leaf
  if (node.type === 'variable') {
    return (
      <button
        type="button"
        className={`${baseClasses} ${stateClasses} font-serif italic text-2xl tracking-wide mx-0.5 focus:outline-none`}
        onClick={handleClick}
        data-node-id={node.id}
        data-node-type="variable"
        data-peelable={isPeelable}
        title={isPeelable ? 'Click to peel term!' : `Target variable: ${node.name}`}
      >
        {node.name}
      </button>
    );
  }

  // Constant Leaf
  const displayVal =
    node.unsimplifiedFraction
      ? `${node.unsimplifiedFraction.n}/${node.unsimplifiedFraction.d}`
      : node.fractionValue && node.fractionValue.d !== 1
      ? `${node.fractionValue.n}/${node.fractionValue.d}`
      : `${node.value ?? (node.fractionValue ? node.fractionValue.n : 0)}`;

  return (
    <button
      type="button"
      className={`${baseClasses} ${stateClasses} font-display text-2xl font-bold mx-0.5 focus:outline-none`}
      onClick={handleClick}
      data-node-id={node.id}
      data-node-type="constant"
      data-peelable={isPeelable}
      title={isPeelable ? 'Click to peel term!' : `Constant: ${displayVal}`}
    >
      {displayVal}
    </button>
  );
};

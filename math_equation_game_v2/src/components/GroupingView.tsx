import React from 'react';
import { ASTNode, BracketType } from '../engine/types';
import { ASTNodeView } from './ASTNodeView';

export interface GroupingViewProps {
  node: ASTNode;
  bracketType?: BracketType;
  onNodeClick: (nodeId: string) => void;
}

export const GroupingView: React.FC<GroupingViewProps> = ({
  node,
  bracketType = 'round',
  onNodeClick
}) => {
  const tierClasses = {
    round: {
      open: '(',
      close: ')',
      border: 'border-blue-200/80',
      bg: 'bg-blue-50/40 hover:bg-blue-50/70',
      text: 'text-blue-600 font-bold text-2xl select-none',
      badge: 'border-blue-400'
    },
    curly: {
      open: '{',
      close: '}',
      border: 'border-purple-200/80',
      bg: 'bg-purple-50/40 hover:bg-purple-50/70',
      text: 'text-purple-600 font-bold text-2xl select-none',
      badge: 'border-purple-400'
    },
    square: {
      open: '[',
      close: ']',
      border: 'border-amber-200/80',
      bg: 'bg-amber-50/40 hover:bg-amber-50/70',
      text: 'text-amber-600 font-bold text-2xl select-none',
      badge: 'border-amber-400'
    }
  }[bracketType];

  return (
    <div
      className={`inline-flex items-center mx-1 px-1.5 py-0.5 rounded-2xl border ${tierClasses.border} ${tierClasses.bg} transition-all duration-200`}
      data-node-id={node.id}
      data-node-type="group"
      data-bracket-tier={bracketType}
    >
      <span className={`${tierClasses.text} mr-0.5`} aria-hidden="true">
        {tierClasses.open}
      </span>
      <div className="inline-flex items-center px-0.5">
        {node.inner && <ASTNodeView node={node.inner} onNodeClick={onNodeClick} />}
      </div>
      <span className={`${tierClasses.text} ml-0.5`} aria-hidden="true">
        {tierClasses.close}
      </span>
    </div>
  );
};

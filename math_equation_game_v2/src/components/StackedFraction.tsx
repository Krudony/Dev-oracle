import React from 'react';
import { ASTNode } from '../engine/types';
import { ASTNodeView } from './ASTNodeView';

export interface StackedFractionProps {
  nodeId: string;
  numeratorNode: ASTNode;
  denominatorNode: ASTNode;
  onNodeClick: (nodeId: string) => void;
  isPeelable?: boolean;
}

export const StackedFraction: React.FC<StackedFractionProps> = ({
  nodeId,
  numeratorNode,
  denominatorNode,
  onNodeClick
}) => {
  return (
    <div
      className="inline-flex flex-col items-center justify-center align-middle mx-1 px-1.5 py-0.5 rounded-xl transition-all duration-200"
      data-node-id={nodeId}
      data-node-type="fraction"
    >
      {/* Numerator */}
      <div className="flex items-center justify-center w-full px-2 py-0.5 text-center">
        <ASTNodeView node={numeratorNode} onNodeClick={onNodeClick} />
      </div>

      {/* Horizontal Solid Fraction Bar */}
      <div
        className="w-full h-[3px] bg-slate-700/90 rounded-full my-1 transition-colors duration-200"
        aria-hidden="true"
      />

      {/* Denominator */}
      <div className="flex items-center justify-center w-full px-2 py-0.5 text-center">
        <ASTNodeView node={denominatorNode} onNodeClick={onNodeClick} />
      </div>
    </div>
  );
};

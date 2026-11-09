import React from 'react';

interface Stage {
  id: string;
  name: string;
}

interface StatusFlowProps {
  stages: Stage[];
  activeStageId: string;
  onStageClick?: (stageId: string) => void;
}

export const StatusFlow: React.FC<StatusFlowProps> = ({
  stages,
  activeStageId,
  onStageClick
}) => {
  const activeIndex = stages.findIndex(s => s.id === activeStageId);

  return (
    <div className="stage-stepper-container">
      <div className="stage-stepper">
        {stages.map((stage, idx) => {
          let stateClass = '';
          if (stage.id === activeStageId) {
            stateClass = 'active';
          } else if (idx < activeIndex) {
            stateClass = 'completed';
          }

          return (
            <div
              key={stage.id}
              className={`stage-step ${stateClass}`}
              onClick={() => onStageClick && onStageClick(stage.id)}
            >
              {idx < activeIndex && <i className="fa-solid fa-check ml-1"></i>}
              <span>{stage.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

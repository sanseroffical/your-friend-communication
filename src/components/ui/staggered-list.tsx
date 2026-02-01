import { ReactNode } from 'react';

interface StaggeredListProps {
  children: ReactNode[];
  staggerDelay?: number;
  initialDelay?: number;
  className?: string;
}

const StaggeredList = ({
  children,
  staggerDelay = 50,
  initialDelay = 0,
  className = ''
}: StaggeredListProps) => {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <div
          key={index}
          style={{
            animation: `staggerFadeIn 300ms ease-out ${initialDelay + index * staggerDelay}ms both`
          }}
        >
          {child}
        </div>
      ))}
      <style>{`
        @keyframes staggerFadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default StaggeredList;

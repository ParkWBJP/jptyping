import React from 'react';

interface Props {
  label: string;
  value: string | number;
  hint?: string;
  danger?: boolean;
}

const StatCard: React.FC<Props> = ({ label, value, hint, danger }) => {
  return (
    <div className="card card-subtle">
      <div className={`stat-value ${danger ? 'danger' : ''}`}>{value}</div>
      <div className="stat-label">{label}</div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
};

export default StatCard;

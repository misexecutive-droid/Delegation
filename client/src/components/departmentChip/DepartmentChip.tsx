import { departmentTagClass } from '../../lib/departmentTagColors';

interface DepartmentChipProps {
  name: string;
  className?: string;
}

const DEFAULT_CLASS = 'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium';

// A department name gets one of a rotating palette of hues (hashed from its own name) so distinct
// departments stay visually distinguishable — the color assignment lives in
// lib/departmentTagColors, this component is just the one shared span markup around it, so tasks
// and tickets render the same department tag instead of each hand-rolling their own.
export const DepartmentChip = ({ name, className = DEFAULT_CLASS }: DepartmentChipProps) => (
  <span className={`${className} ${departmentTagClass(name)}`}>{name}</span>
);

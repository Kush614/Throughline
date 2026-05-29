import WorkstationApp from './_client/App';
import './workstation.css';

export const metadata = {
  title: 'Throughline Workstation — Atlas Q3 Launch',
};

export default function WorkstationPage() {
  return (
    <div className="workstation-root">
      <WorkstationApp />
    </div>
  );
}

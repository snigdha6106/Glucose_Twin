import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, PageId } from './components/Sidebar';
import { HomePage } from './pages/HomePage';
import { DatasetExplorerPage } from './pages/DatasetExplorerPage';
import { DigitalTwinPage } from './pages/DigitalTwinPage';
import { PredictionLabPage } from './pages/PredictionLabPage';
import { ExplainabilityLabPage } from './pages/ExplainabilityLabPage';
import { SimulationLabPage } from './pages/SimulationLabPage';
import { ModelComparisonPage } from './pages/ModelComparisonPage';
import { ResearchInsightsPage } from './pages/ResearchInsightsPage';
import { AnatomicalTwinPage } from './pages/AnatomicalTwinPage';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageId>('home');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />

        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
          {currentPage === 'home' && <HomePage onNavigate={setCurrentPage} />}
          {currentPage === 'anatomy' && <AnatomicalTwinPage />}
          {currentPage === 'datasets' && <DatasetExplorerPage />}
          {currentPage === 'digital-twin' && <DigitalTwinPage />}
          {currentPage === 'predictions' && <PredictionLabPage />}
          {currentPage === 'explainability' && <ExplainabilityLabPage />}
          {currentPage === 'simulation' && <SimulationLabPage />}
          {currentPage === 'comparison' && <ModelComparisonPage />}
          {currentPage === 'insights' && <ResearchInsightsPage />}
        </main>
      </div>
    </div>
  );
};

export default App;

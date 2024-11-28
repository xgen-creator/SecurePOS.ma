import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  BarChart, 
  PieChart, 
  Line, 
  Bar, 
  Pie, 
  XAxis, 
  YAxis, 
  Tooltip 
} from 'recharts';
import { saveAs } from 'file-saver';

const AnalyticsDashboard = () => {
  const [dashboardConfig, setDashboardConfig] = useState({
    layout: 'grid',
    metrics: ['visits', 'usage', 'performance'],
    timeRange: 'week'
  });

  const [reportConfig, setReportConfig] = useState({
    format: 'pdf',
    schedule: null,
    recipients: []
  });

  const generateReport = async () => {
    try {
      const data = await collectReportData();
      const report = await formatReport(data);
      
      if (reportConfig.format === 'pdf') {
        await generatePDFReport(report);
      } else {
        await exportToExcel(report);
      }
    } catch (error) {
      console.error('Erreur génération rapport:', error);
    }
  };

  const exportData = async (format) => {
    try {
      const data = await collectExportData();
      
      switch (format) {
        case 'csv':
          const csv = convertToCSV(data);
          saveAs(new Blob([csv]), 'export.csv');
          break;
        case 'json':
          saveAs(
            new Blob([JSON.stringify(data, null, 2)]), 
            'export.json'
          );
          break;
        case 'excel':
          const excel = await generateExcel(data);
          saveAs(new Blob([excel]), 'export.xlsx');
          break;
      }
    } catch (error) {
      console.error('Erreur export:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tableau de Bord Analytics</h1>
        <div className="flex gap-2">
          <button 
            className="px-4 py-2 bg-blue-500 text-white rounded-lg"
            onClick={() => generateReport()}
          >
            Générer Rapport
          </button>
          <button 
            className="px-4 py-2 bg-green-500 text-white rounded-lg"
            onClick={() => exportData('excel')}
          >
            Exporter
          </button>
        </div>
      </div>

      {/* Widgets configurables */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <DashboardWidget
          type="visitors"
          data={visitorData}
          config={dashboardConfig}
        />
        <DashboardWidget
          type="usage"
          data={usageData}
          config={dashboardConfig}
        />
        <DashboardWidget
          type="performance"
          data={performanceData}
          config={dashboardConfig}
        />
      </div>

      {/* Graphiques personnalisés */}
      <div className="grid grid-cols-2 gap-6">
        <CustomChart
          type="line"
          data={timeSeriesData}
          config={{
            metrics: ['visits', 'interactions'],
            color: 'blue'
          }}
        />
        <CustomChart
          type="bar"
          data={categoryData}
          config={{
            metrics: ['duration', 'frequency'],
            color: 'green'
          }}
        />
      </div>
    </div>
  );
};

// Composant Widget personnalisable
const DashboardWidget = ({ type, data, config }) => {
  const [widgetConfig, setWidgetConfig] = useState({
    ...config,
    type
  });

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">{widgetConfig.title}</h3>
        <button 
          onClick={() => setWidgetConfig({ ...widgetConfig })}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          Configure
        </button>
      </div>

      <div className="h-64">
        {renderWidget(type, data, widgetConfig)}
      </div>
    </div>
  );
};

// Composant graphique personnalisé
const CustomChart = ({ type, data, config }) => {
  const [chartConfig, setChartConfig] = useState(config);

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart width={500} height={300} data={data}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={chartConfig.color} 
            />
          </LineChart>
        );
      case 'bar':
        return (
          <BarChart width={500} height={300} data={data}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar 
              dataKey="value" 
              fill={chartConfig.color} 
            />
          </BarChart>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="mb-4">
        <h3 className="font-semibold">{chartConfig.title}</h3>
      </div>
      {renderChart()}
    </div>
  );
};

export default AnalyticsDashboard;

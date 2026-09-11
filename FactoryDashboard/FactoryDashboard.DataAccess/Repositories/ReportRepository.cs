using FactoryDashboard.DataAccess.Interfaces;
using FactoryDashboard.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace FactoryDashboard.DataAccess.Repositories
{
    public class ReportRepository : IReportRepository
    {
        private readonly FactoryDashboardContext _context;
        public ReportRepository(FactoryDashboardContext context)
        {
            _context = context;
        }
        public List<Report> GetAllReports()
        {
            return _context.Reports.ToList();
        }
        public List<Report> GetActiveAlarms()
        {
            return _context.Reports.Where(r => r.ResolvedAt == null).ToList();
        }
        public void AddReport(Report report)
        {
            _context.Reports.Add(report);
            _context.SaveChanges();
        }
    }
}

using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Threading.Tasks;

namespace FactoryDashboard.Entities
{
    public class Sensor
    {
        public required string SensorId { get; set; }
        public required string SensorName { get; set; }
        public required string Type { get; set; }
        public required string Unit { get; set; }
        public double minThreshold { get; set; }
        public double maxThreshold { get; set; }
        public string? ResponsibleUserId { get; set; }
        public required string CoopId { get; set; }
        public double MaxCapacity { get; set; }
        public double? PositionX { get; set; }
        public double? PositionY { get; set; }
        public string? PlcId { get; set; }
        public int? PlcDbNumber { get; set; }
        public int? PlcStartByte { get; set; }
        public string? PlcDataType { get; set; } //veri tipleri : "Real", "Int", "Bool" falan
        public int? PlcBitOffset { get; set; }
    }
}

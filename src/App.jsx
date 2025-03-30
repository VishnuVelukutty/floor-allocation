import { useState, useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { ChevronDown, ChevronRight, ChevronLeft } from "lucide-react";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend
);

// Import JSON data directly (assuming this is the structure in your assets folder)
import floorData from './assets/floor.json';
import buildingData from './assets/data.json';

function App() {
  const [floors, setFloors] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState("");
  const [chartType, setChartType] = useState("Distributed");
  const [isFloorDropdownOpen, setIsFloorDropdownOpen] = useState(false);
  const [isChartTypeDropdownOpen, setIsChartTypeDropdownOpen] = useState(false);
  const [chartData, setChartData] = useState({
    totalArea: 0,
    occupiedArea: 0,
    remaining_area: 0,
    occupiedPercentage: 0,
    remainingPercentage: 0,
    allFloorsData: [],
    companies: [],
    blockedFloors: [],
  });
  const [isCompanyPanelOpen, setIsCompanyPanelOpen] = useState(true);
  const [expandedFloors, setExpandedFloors] = useState({});

  // Refs for dropdown containers
  const floorDropdownRef = useRef(null);
  const chartTypeDropdownRef = useRef(null);

  // Handle clicks outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (floorDropdownRef.current && !floorDropdownRef.current.contains(event.target)) {
        setIsFloorDropdownOpen(false);
      }
      if (chartTypeDropdownRef.current && !chartTypeDropdownRef.current.contains(event.target)) {
        setIsChartTypeDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Load floor data from local JSON
  useEffect(() => {
    try {
      // Check if floorData is imported correctly and has the expected structure
      if (floorData && floorData.status === "success") {
        setFloors(floorData.data);

        // Initialize expanded state for each floor
        const initialExpanded = {};
        floorData.data.forEach((floor) => {
          initialExpanded[floor.floor] = false;
        });
        setExpandedFloors(initialExpanded);
      } else {
        console.error("Floor data is not in the expected format", floorData);
      }
    } catch (error) {
      console.error("Error processing floor data:", error);
    }
  }, []);

  // Update chart data when selected floor changes
  useEffect(() => {
    processChartData(selectedFloor);
  }, [selectedFloor, chartType]);

  // Process the chart data from local JSON
  const processChartData = (floorName = "") => {
    try {
      // Check if buildingData is imported correctly
      if (buildingData && buildingData.status === "success") {
        const data = buildingData.data;

        // Process building-level data
        const buildingInfo = {
          totalArea: data.building_total_area || 0,
          occupiedArea: data.building_occupied_area || 0,
          remaining_area: data.building_remaining_area || 0,
          occupiedPercentage: data.building_occupied_percentage || 0,
          remainingPercentage: data.building_remaining_percentage || 0,
        };

        // Process floors data
        const allFloorsData = data.floors_data || [];
        const companies = [];
        const blockedFloors = [];

        // Collect all companies and identify blocked floors
        allFloorsData.forEach((floor) => {
          if (floor.remark === "blocked") {
            blockedFloors.push(floor.name);
          }

          if (floor.companies) {
            floor.companies.forEach((company) => {
              companies.push({
                ...company,
                floorName: floor.name,
                isBlocked: floor.remark === "blocked",
              });
            });
          }
        });

        // If specific floor is selected, update the building info to match that floor's data
        if (floorName) {
          const selectedFloorData = allFloorsData.find((floor) => floor.name === floorName);
          if (selectedFloorData) {
            buildingInfo.totalArea = selectedFloorData.total_area || 0;
            buildingInfo.occupiedArea = selectedFloorData.occupied_area || 0;
            buildingInfo.remaining_area = selectedFloorData.remaining_area || 0;
            buildingInfo.occupiedPercentage = selectedFloorData.occupied_percentage || 0;
            buildingInfo.remainingPercentage = selectedFloorData.remaining_percentage || 0;
          }
        }

        // Update chart data state
        setChartData({
          ...buildingInfo,
          allFloorsData,
          companies,
          blockedFloors,
        });
      } else {
        console.error("Building data is not in the expected format", buildingData);
      }
    } catch (error) {
      console.error("Error processing building data:", error);
    }
  };

  const toggleFloorExpansion = (floorName) => {
    setExpandedFloors((prev) => ({
      ...prev,
      [floorName]: !prev[floorName],
    }));
  };

  const getChartConfig = () => {
    const displayData = selectedFloor
      ? [{
        name: selectedFloor,
        occupied_percentage: chartData.allFloorsData.find(floor => floor.name === selectedFloor)?.occupied_percentage || 0,
        blocked_percentage: chartData.blockedFloors.includes(selectedFloor) ? 100 : 0,
        unoccupied_percentage: chartData.blockedFloors.includes(selectedFloor) ? 0 : (100 - (chartData.allFloorsData.find(floor => floor.name === selectedFloor)?.occupied_percentage || 0)),
        companies: chartData.allFloorsData.find(floor => floor.name === selectedFloor)?.companies || [],
        isBlocked: chartData.blockedFloors.includes(selectedFloor)
      }]
      : floors.map(floor => {
        const floorData = chartData.allFloorsData.find(data => data.name === floor.floor);
        const isBlocked = chartData.blockedFloors.includes(floor.floor);

        return {
          name: floor.floor,
          occupied_percentage: isBlocked ? 0 : (floorData?.occupied_percentage || 0),
          blocked_percentage: isBlocked ? 100 : 0,
          unoccupied_percentage: isBlocked ? 0 : (100 - (floorData?.occupied_percentage || 0)),
          companies: floorData?.companies || [],
          isBlocked
        };
      });

    const safeDisplayData = Array.isArray(displayData) ? displayData : [];
    const isBlocked = selectedFloor && chartData.blockedFloors.includes(selectedFloor);

    const commonTooltip = {
      bodyFont: { size: 14, weight: "bold" },
      titleFont: { size: 16, weight: "bold" },
      callbacks: {
        label: function (context) {
          const floorData = selectedFloor ? safeDisplayData[0] : safeDisplayData[context.dataIndex];
          if (!floorData) return "";
          if (floorData.isBlocked) return "Reserved for IIT-Bombay: 100%";
          return `${context.dataset.label}: ${context.parsed.y || context.parsed}%`;
        },
        afterLabel: function (context) {
          const floorData = selectedFloor ? safeDisplayData[0] : safeDisplayData[context.dataIndex];
          if (!floorData) return "";
          if (floorData.isBlocked) return "This floor is reserved for IIT-Bombay use";
          return null;
        }
      }
    };

    if (chartType === "Bar") {
      return {
        data: {
          labels: isBlocked
            ? ["Reserved for IIT-Bombay"]
            : selectedFloor
              ? ["Occupied", "Remaining"]
              : safeDisplayData.map(floor => floor.name),
          datasets: [
            {
              label: "Area Allocation",
              data: isBlocked
                ? [100]
                : selectedFloor
                  ? [chartData.occupiedPercentage, chartData.remainingPercentage]
                  : safeDisplayData.map(floor => floor.occupied_percentage),
              backgroundColor: isBlocked
                ? ["#999999"]
                : selectedFloor
                  ? ["#007200", "#FF6600"]
                  : safeDisplayData.map(floor =>
                    floor.isBlocked ? "rgba(169, 169, 169, 0.7)" : "#007200"),
              borderColor: isBlocked
                ? ["#777777"]
                : selectedFloor
                  ? ["#007200", "#FF6600"]
                  : safeDisplayData.map(floor =>
                    floor.isBlocked ? "rgba(169, 169, 169, 0.7)" : "#007200"),
              borderWidth: 1,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "top",
              labels: {
                color: "#000",
                font: {
                  size: 14,
                  weight: "bold",
                },
              },
            },
            title: {
              display: true,
              text: selectedFloor
                ? `${selectedFloor} Area Distribution`
                : isBlocked
                  ? "Reserved Floor"
                  : "Building Area Distribution",
              color: "#000",
              font: {
                size: 18,
                weight: "bold",
              },
            },
            tooltip: commonTooltip,
          },
          onClick: (event, elements) => {
            if (elements.length > 0 && !selectedFloor) {
              const element = elements[0];
              const dataIndex = element.index;
              const floorName = safeDisplayData[dataIndex]?.name;
              if (floorName) {
                setSelectedFloor(floorName);
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              ticks: {
                color: "#000",
                font: {
                  size: 12,
                  weight: "bold",
                },
                callback: function (value) {
                  return value + "%";
                },
              },
              grid: {
                color: "rgba(0,0,0,0.1)",
              },
            },
            x: {
              ticks: {
                color: "#000",
                font: {
                  size: 12,
                  weight: "bold",
                },
              },
              grid: {
                color: "rgba(0,0,0,0.1)",
              },
            },
          },
        },
      };
    }

    if (chartType === "Doughnut") {
      return {
        data: {
          labels: isBlocked
            ? ["Reserved for IIT-Bombay"]
            : ["Occupied", "Remaining"],
          datasets: [
            {
              label: "Area Allocation",
              data: isBlocked
                ? [100]
                : [chartData.occupiedPercentage, chartData.remainingPercentage],
              backgroundColor: isBlocked ? ["#999999"] : ["#007200", "#FF6600"],
              borderColor: isBlocked ? ["#777777"] : ["#007200", "#FF6600"],
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "top",
              labels: {
                color: "#000",
                font: {
                  size: 14,
                  weight: "bold",
                },
              },
            },
            title: {
              display: true,
              text: selectedFloor
                ? `${selectedFloor} Area Distribution`
                : isBlocked
                  ? "Reserved Floor"
                  : "Building Area Distribution",
              color: "#000",
              font: {
                size: 18,
                weight: "bold",
              },
            },
            tooltip: commonTooltip,
          },
        },
      };
    }

    // Distributed chart configuration
    return {
      data: {
        labels: safeDisplayData.map(floor => floor.name),
        datasets: [
          {
            label: "Occupied Percentage",
            data: safeDisplayData.map(floor => floor.occupied_percentage),
            backgroundColor: "#007200",
            borderColor: "#007200",
            borderWidth: 1,
          },
          {
            label: "Reserved for IIT-Bombay",
            data: safeDisplayData.map(floor => floor.blocked_percentage),
            backgroundColor: "rgba(169, 169, 169, 0.7)",
            borderColor: "rgba(169, 169, 169, 0.7)",
            borderWidth: 1,
          },
          {
            label: "Remaining Percentage",
            data: safeDisplayData.map(floor => floor.unoccupied_percentage),
            backgroundColor: "#FF6600",
            borderColor: "#FF6600",
            borderWidth: 1,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: {
              font: {
                size: 14,
                weight: "bold",
              },
            },
          },
          title: {
            display: true,
            text: selectedFloor
              ? `Occupancy Percentage for ${selectedFloor}`
              : "Floor-wise Occupancy",
            color: "#000",
            font: {
              size: 18,
              weight: "bold",
            },
          },
          tooltip: commonTooltip,
        },
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const element = elements[0];
            const dataIndex = element.index;
            const floorName = safeDisplayData[dataIndex]?.name;
            if (floorName) {
              setSelectedFloor(floorName);
            }
          }
        },
        scales: {
          y: {
            stacked: true,
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: "Occupancy (%)",
              font: {
                size: 14,
                weight: "bold",
              },
            },
            ticks: {
              font: {
                size: 12,
                weight: "bold",
              },
              callback: function (value) {
                return value + "%";
              },
            },
          },
          x: {
            stacked: true,
            title: {
              display: !selectedFloor,
              text: "Floors",
              font: {
                size: 14,
                weight: "bold",
              },
            },
            ticks: {
              font: {
                size: 12,
                weight: "bold",
              },
            },
          },
        },
      },
    };
  };

  const renderCompanyDetails = () => {
    if (selectedFloor) {
      const floorData = chartData.allFloorsData.find(
        (floor) => floor.name === selectedFloor
      );
      const isBlocked = chartData.blockedFloors.includes(selectedFloor);

      if (isBlocked) {
        return (
          <div className="text-center p-4 bg-gray-100 rounded-lg">
            <h4 className="font-bold text-gray-900 mb-2 text-lg">
              Reserved Floor
            </h4>
            <p className="text-gray-800 text-base">
              This floor is reserved for IIT-Bombay use and is not available for
              company allocation.
            </p>
          </div>
        );
      }

      const floorCompanies = chartData.companies.filter(
        (company) => company.floorName === selectedFloor
      );

      return (
        <div>
          {floorCompanies.length > 0 ? (
            floorCompanies.map((company, index) => (
              <div
                key={index}
                className="bg-white border-b last:border-b-0 
                p-3 hover:bg-[rgba(0,51,102,0.02)] mb-2 rounded"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900 text-base">
                    {company.name}
                  </span>
                  <span
                    className="bg-[#003366] text-white 
                    px-3 py-1 rounded text-sm font-bold"
                  >
                    {company.occupied_percentage}%
                  </span>
                </div>
                <div className="text-gray-800 text-sm mt-1">
                  Area: {company.occupied_area || "N/A"} sq ft
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-800 italic p-3 text-base">
              No companies on this floor
            </div>
          )}
        </div>
      );
    }

    return (
      <div>
        {floors.map((floor) => {
          const isBlocked = chartData.blockedFloors.includes(floor.floor);
          const floorCompanies = chartData.companies.filter(
            (company) => company.floorName === floor.floor
          );

          return (
            <div key={floor.id} className="mb-3">
              <div
                className={`flex justify-between items-center 
                p-3 rounded cursor-pointer 
                ${isBlocked
                    ? "bg-gray-200 hover:bg-gray-300"
                    : "bg-[rgba(0,51,102,0.05)] hover:bg-[rgba(0,51,102,0.1)]"
                  }`}
                onClick={() => toggleFloorExpansion(floor.floor)}
              >
                <span className="font-bold text-gray-900 text-base">
                  {floor.floor}
                  {isBlocked && (
                    <span className="ml-2 text-sm bg-gray-600 text-white px-2 py-1 rounded font-bold">
                      Reserved
                    </span>
                  )}
                </span>
                <ChevronDown
                  className={`transition-transform duration-300 
                  ${expandedFloors[floor.floor] ? "rotate-180" : ""}`}
                  size={24}
                />
              </div>

              {expandedFloors[floor.floor] && (
                <div className="pl-3 mt-2">
                  {isBlocked ? (
                    <div className="text-center p-3 bg-gray-100 rounded">
                      <p className="text-gray-800 text-base">
                        This floor is reserved for IIT-Bombay use
                      </p>
                    </div>
                  ) : floorCompanies.length > 0 ? (
                    floorCompanies.map((company, index) => (
                      <div
                        key={index}
                        className="bg-white border-b last:border-b-0 
                        p-3 hover:bg-[rgba(0,51,102,0.02)]"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-gray-900 text-base">
                            {company.name}
                          </span>
                          <span
                            className="bg-[#003366] text-white 
                            px-3 py-1 rounded text-sm font-bold"
                          >
                            {company.occupied_percentage}%
                          </span>
                        </div>
                        <div className="text-gray-800 text-sm mt-1">
                          Area: {company.occupied_area || "N/A"} sq ft
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-800 italic p-3 text-base">
                      No companies on this floor
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
<nav className="flex items-center justify-between w-full">
  <img src='src/assets/Logo.png' alt='aspire-logo' />
  <h1 className="text-2xl uppercase tracking-wider font-extrabold mx-auto">
    Floor Allocation Dashboard
  </h1>
</nav>


      <div className="max-w-[1400px] h-[90vh] mx-auto p-4 flex font-sans">
        <div className="w-[70%] pr-4 flex flex-col">


          <div className="flex justify-end items-center gap-4 mb-4">
            <div
              ref={floorDropdownRef}
              className="relative w-64"
              onClick={() => setIsFloorDropdownOpen(!isFloorDropdownOpen)}
            >
              <div
                className="flex justify-between items-center 
              bg-white border border-[rgba(0,51,102,0.3)] 
              rounded-lg px-4 py-3 cursor-pointer"
              >
                <span className="flex-grow overflow-hidden text-ellipsis whitespace-nowrap font-bold text-gray-900 text-base">
                  {selectedFloor || "All Floors"}
                </span>
                <ChevronDown
                  className={`ml-2 transition-transform duration-300 
                ${isFloorDropdownOpen ? "rotate-180" : ""}`}
                  size={24}
                />
              </div>

              {isFloorDropdownOpen && (
                <div
                  className="absolute top-full left-0 w-full 
                bg-white border border-[rgba(0,51,102,0.2)] 
                rounded-lg mt-1 max-h-72 overflow-y-auto 
                shadow-lg z-20"
                >
                  <div
                    className={`px-4 py-3 cursor-pointer hover:bg-[rgba(0,51,102,0.05)] font-bold text-base
                  ${!selectedFloor ? "bg-[rgba(0,51,102,0.1)]" : ""}`}
                    onClick={() => {
                      setSelectedFloor("");
                      setIsFloorDropdownOpen(false);
                    }}
                  >
                    All Floors
                  </div>
                  {floors.map((floor) => (
                    <div
                      key={floor.id}
                      className={`px-4 py-3 cursor-pointer hover:bg-[rgba(0,51,102,0.05)] font-bold text-base
                    ${selectedFloor === floor.floor
                          ? "bg-[rgba(0,51,102,0.1)]"
                          : ""
                        }
                    ${chartData.blockedFloors.includes(floor.floor)
                          ? "opacity-70"
                          : ""
                        }`}
                      onClick={() => {
                        setSelectedFloor(floor.floor);
                        setIsFloorDropdownOpen(false);
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <span>{floor.floor}</span>
                        {chartData.blockedFloors.includes(floor.floor) && (
                          <span className="text-sm bg-gray-600 text-white px-2 py-1 rounded font-bold">
                            Reserved
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              ref={chartTypeDropdownRef}
              className="relative w-48"
              onClick={() => setIsChartTypeDropdownOpen(!isChartTypeDropdownOpen)}
            >
              <div
                className="flex justify-between items-center 
              bg-white border border-[rgba(0,51,102,0.3)] 
              rounded-lg px-4 py-3 cursor-pointer"
              >
                <span className="capitalize font-bold text-gray-900 text-base">
                  {chartType}
                </span>
                <ChevronDown
                  className={`ml-2 transition-transform duration-300 
                ${isChartTypeDropdownOpen ? "rotate-180" : ""}`}
                  size={24}
                />
              </div>

              {isChartTypeDropdownOpen && (
                <div
                  className="absolute top-full left-0 w-full 
                bg-white border border-[rgba(0,51,102,0.2)] 
                rounded-lg mt-1 
                shadow-lg z-20"
                >
                  {["Distributed", "Bar", "Doughnut"].map((type) => (
                    <div
                      key={type}
                      className={`px-4 py-3 cursor-pointer hover:bg-[rgba(0,51,102,0.05)] font-bold text-base
                    ${chartType === type ? "bg-[rgba(0,51,102,0.1)]" : ""}`}
                      onClick={() => {
                        setChartType(type);
                        setIsChartTypeDropdownOpen(false);
                      }}
                    >
                      {type}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div
            className="h-[520px] bg-white rounded-lg p-4 mb-4 
          flex items-center justify-center shadow-md 
          border border-[rgba(0,51,102,0.1)] overflow-hidden relative"
          >
            {chartType === "Bar" ? (
              <Bar {...getChartConfig()} />
            ) : chartType === "Doughnut" ? (
              <Doughnut {...getChartConfig()} />
            ) : chartType === "Distributed" ? (
              <Bar {...getChartConfig()} />
            ) : (
              <Bar {...getChartConfig()} />
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              {
                title: "Total Rentable Area",
                value: `${chartData.totalArea.toLocaleString()} sq ft`,
              },
              {
                title: "Total Occupied Area",
                value: `${chartData.occupiedArea.toLocaleString()} sq ft`,
              },
              {
                title: "Remaining Area",
                value: `${chartData.remaining_area.toLocaleString()} sq ft`,
              },
            ].map((stat, index) => (
              <div
                key={index}
                className="bg-white rounded-lg p-4 text-center 
              border border-transparent shadow-md 
              hover:shadow-lg transition-all duration-300"
              >
                <h3 className="font-bold text-gray-900 mb-3 text-base">
                  {stat.title}
                </h3>
                <p className="text-2xl font-extrabold text-[#003366]">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div
          className={`w-[30%] relative transition-all duration-300 ${isCompanyPanelOpen ? "translate-x-0" : "translate-x-full"
            }`}
        >
          <div className="bg-white rounded-lg h-full p-4 shadow-md border border-[rgba(0,51,102,0.1)] overflow-y-auto">
            <h3 className="font-bold text-xl mb-4 text-[#003366]">
              {selectedFloor ? `${selectedFloor} Companies` : "All Companies"}
            </h3>

            {renderCompanyDetails()}
          </div>
        </div>
      </div>
    </>
  );
}

export default App
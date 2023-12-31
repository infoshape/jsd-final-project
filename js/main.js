import { 
  TableauViz,
  TableauEventType,
  FilterUpdateType,
} from "https://public.tableau.com/javascripts/api/tableau.embedding.3.latest.js";

let vizWorksheets= [];
const vizUrls = [

  "https://public.tableau.com/views/2023_CtG06_EducationPathways_Supp/FigureSE6c_1",
  "https://public.tableau.com/views/CtG04_EarlyYears_Disaggs_2023/FigureCtG4_5",
  "https://public.tableau.com/views/2023_CtG06_EducationPathways_Supp/FigureSE6a_3"

] // vizzes

for( let i=0; i < vizUrls.length; i++ ){

  initialiseViz(i, vizUrls[i]);

}; // initialise vizzes

function initialiseViz( vizIndex, vizUrl ) {

  const viz = new TableauViz();
  viz.hideTabs = true;

  const onFirstInteractive = () => {

    const currentWorksheet = viz.workbook.activeSheet.worksheets[0];
    vizWorksheets[vizIndex] = currentWorksheet;
    getTableData( vizIndex );
  };

  viz.addEventListener(TableauEventType.FirstInteractive, onFirstInteractive);
  viz.addEventListener(TableauEventType.FilterChanged, onFilterChanged);
  viz.src = vizUrl;
  document.getElementById(`tableauViz${vizIndex}`).appendChild(viz);

} // initialiseViz()

export async function getTableData( vizIndex ){

  const currentWorksheet = vizWorksheets[ vizIndex ];

  // Request header and data, process headers
  const dataLabelIndexes = await requestHeaderProcessColumns( currentWorksheet );
  const dataTable = await requestData( currentWorksheet ); 

  // Store off specific table values: tableNumber, unit, dataIndex, whether the data has 1 decimal place.
  const tableNumber = dataTable[0][dataLabelIndexes.TableNumber].formattedValue;
  const unit = dataTable[0][dataLabelIndexes.Unit].formattedValue;
  const dataIndex = ( dataLabelIndexes.Value1dp > -1  ) ? dataLabelIndexes.Value1dp : dataLabelIndexes.DataValue;
  const set1dp = ( dataLabelIndexes.Value1dp > -1  ) ? true : false;
  
  // Data table reduce size/columns, pivot and render.
  const simplifiedDataTable = reduceData( dataTable, dataLabelIndexes, dataIndex );
  const pivotTable = pivotData( simplifiedDataTable );
  renderHtml( pivotTable, tableNumber, unit, vizIndex, set1dp );

}; // getTableData()

async function requestHeaderProcessColumns( worksheet ){

  const dataHeader = await worksheet.getSummaryColumnsInfoAsync();

  // Data column names have been prefixed with 'Grp'(optional), 'Row', 'Col' to identify inputs to the pivot function.
  // The data value '1dp' (1 decimal place) has precedence over 'Data Value' when both are present.
  let dataLabelIndexes = {}; 
  const labels = ["Grp", "Row", "Col", "Data String", "Unit", "Table Number", "(Data Value)", "Value (1dp)"];
  const dataLabels  = dataHeader.map( h => h.fieldName );

  for( let i=0; i < labels.length; i++ ){ // Find the array indexes of all the important columns.
    
    const currentDataLabel = dataLabels.findIndex( l => l.includes( labels[i] ) );

    if( currentDataLabel > -1 ){

      dataLabelIndexes[ labels[i].replace(/[\s\(\)]/g, '') ] = currentDataLabel;  // regex removes spaces and brackets
    }
  }
  return dataLabelIndexes; 

}; // requestHeaderProcessColumns()

async function requestData( worksheet ){

  const summaryDataOptions = {

      maxRows: 0,
      ignoreAliases: false,
      ignoreSelection: true,
      includeDataValuesOption: 'only-formatted-values',
  };

  const summaryData = await worksheet.getSummaryDataAsync(summaryDataOptions);
  return summaryData.data;

}; // requestData()

function reduceData( dataTable, dataLabelIndexes, dataIndex ){

  let simplifiedDataTable = [];
  const pivotInputOrder = [ dataLabelIndexes.Row, dataLabelIndexes.Col, dataIndex ];

  for( let i=0; i < dataTable.length; i++ ){

    simplifiedDataTable[i] = [];
    let j = 0;
    for( const inputIndex of pivotInputOrder ){

      if( dataIndex === inputIndex ){ // data value or 1dp

        if( dataTable[i][dataIndex].formattedValue === 'Null' ){
          // Use the string from the 'Data String' column to replace the data value since its Null.
          simplifiedDataTable[i][j] = dataTable[i][dataLabelIndexes.DataString].formattedValue;

        } else if( typeof dataTable[i][dataIndex].formattedValue === 'number' ){

          simplifiedDataTable[i][j] = dataTable[i][dataIndex].formattedValue;
        } else {

          simplifiedDataTable[i][j] = parseFloat( dataTable[i][dataIndex].formattedValue.replace( ',', '' ) );
        }
      } else { // Not a data value or 1dp

        simplifiedDataTable[i][j] = dataTable[i][inputIndex].formattedValue;
      }
      j++;
    }
  }
  return simplifiedDataTable;

}; // reduceData()

function pivotData( dataTable ){

  // Prepare the header row
  const columnHeadings = new Set(dataTable.map( ( num, index, arr ) => arr[index][1] ));
  const colHeadingArray = [ "", ...columnHeadings ];

  // Pivot (like crosstab) the data returned by the API request getSummaryDataAsync() after being stripped back.
  const rows = dataTable.reduce( ( accumulator, currentValue ) => {

    const currentRowKey = currentValue[0];

    if( !accumulator[currentRowKey] ){

      accumulator[currentRowKey] = [];
    } 
    accumulator[currentRowKey].push( currentValue );

    return accumulator;

  }, {});
  
  let result = [];

  Object.keys( rows ).map( currentRowKey => {

    const dataValues = rows[currentRowKey].map( array => array[2] );

    result.push( [ currentRowKey, ...dataValues ] );

  });

  // Insert the header row
  result.unshift( colHeadingArray );
  return result;
  
}; // pivotData()

function renderHtml( pivotTable, tableNumber, unit, vizIndex, set1dp ){ 
  
  const rowHeaders = [""];
  let result = "<table data-unit='" + unit + "' class='table datatable mb-4'>";
  result += "<caption style='padding-bottom:0;color:#2c2c2c; font-weight:400;'>Data in figure (" + unit + ")</caption><thead>";

  pivotTable.forEach(( row, rowIndex ) => {

    // Table header
    if( rowIndex === 0 ){  

      result += "<tr>";
      row.forEach( ( item, colIndex ) => {
          if( colIndex < rowHeaders.length ){
              result += "<th scope='col'><span class='visually-hidden'>" + item.toString() + "</span></th>";
          } else {
              result += "<th scope='col' style='text-align: right;'>" + item.toString() + "</th>";
          }
      });
      result += "</tr></thead><tbody>";

      // Table body
    } else {  

      result += "<tr>";
      row.forEach( ( item, colIndex ) => {

          if( colIndex < rowHeaders.length ){
            
            result += "<th scope='row'>" + item.toString() + "</th>";
          
          } else {
            
              if( (set1dp) && ( (item.toString() !== '&ndash;') && (item.toString() !== '..') && (item.toString() !== 'na') && (item.toString() !== 'np') ) ) { // Set 1 decimal place for nnn.0 but not 0 or 0.0

                  result += "<td style='text-align: right;'>" + item.toFixed(1).toLocaleString('en-US') + "</td>";

              } else {

                  result += "<td style='text-align: right;'>" + item.toLocaleString('en-US') + "</td>";
              }
          }
      });
      result += "</tr>";
    }
  });
  result += "</tbody></table>";
  
  $( `#dataTable${ vizIndex }` ).html( result );

}; // renderHtml()

export async function filter( filterName, filterValue ){
  
  // Called by HTML buttons to filter all visualisations and update the data tables.
  for( let i=0; i < vizWorksheets.length; i++ ){ 

    const filterValueArray = Array.of( filterValue );
    await vizWorksheets[ i ].applyFilterAsync(filterName, filterValueArray, FilterUpdateType.Replace);
    getTableData( i );
  };
}; // filter() Two filters: "Jurisdiction" or "Indigenous Status"

function onFilterChanged( ev ){

  // Listener event called if on-chart filters are changed.
  const vizIndex = ev.target.parentElement.id.replace( 'tableauViz', '' );
  getTableData( vizIndex );

}; // onFilterChanged()
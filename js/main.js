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
    console.log('viz worksheets:', vizWorksheets);
    getTableData( vizIndex, 'default' );
  };

  viz.addEventListener(TableauEventType.FirstInteractive, onFirstInteractive);
  viz.addEventListener(TableauEventType.FilterChanged, onFilterChanged);
  viz.src = vizUrl;
  document.getElementById(`tableauViz${vizIndex}`).appendChild(viz);

} // initialiseViz()

export async function getTableData( vizIndex, htmlTable = 'current' ){

  const currentWorksheet = vizWorksheets[ vizIndex ];
  console.log('vizIndex:', vizIndex);
  console.log('currentWorksheet:', currentWorksheet);
  const dataLabelIndexes = await requestHeaderProcessColumns( currentWorksheet );
  const dataTable = await requestData( currentWorksheet ); 
  console.log('Data table:', dataTable);

  // Get table values
  const tableNumber = dataTable[0][dataLabelIndexes.TableNumber].formattedValue;
  const unit = dataTable[0][dataLabelIndexes.Unit].formattedValue;
  console.log('Val:', dataLabelIndexes.DataValue);
  console.log('1dp:', dataLabelIndexes.Value1dp);
  
  const simplifiedDataTable = reduceData( dataTable, dataLabelIndexes );
  const pivotTable = pivotData( simplifiedDataTable );
  console.log('Pivot table:', pivotTable);
  renderHtml( pivotTable, tableNumber, unit, vizIndex );

}; // getTableData()

export async function filter( filterName, filterValue ) {
  
  for( let i=0; i < vizWorksheets.length; i++ ){ // Update the filter and getTableData for all tab vizzes

    const filterValueArray = Array.of( filterValue );
    await vizWorksheets[ i ].applyFilterAsync(filterName, filterValueArray, FilterUpdateType.Replace);
    getTableData( i );
  };
}; // filter(): "Jurisdiction" or "Indigenous Status"

function onFilterChanged( ev ){

  const vizIndex = ev.target.parentElement.id.replace('tableauViz', '');
  getTableData( vizIndex );

}; // onFilterChanged()

async function requestHeaderProcessColumns( worksheet ){

  const dataHeader = await worksheet.getSummaryColumnsInfoAsync();

  // Data column names have been prefixed: 'Grp'(optional), 'Row', 'Col' to identify inputs to the pivot.
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
  console.log('Data labels:', dataLabelIndexes);
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

function reduceData( dataTable, dataLabelIndexes ){

  let simplifiedDataTable = [];
  const dataIndex = ( dataLabelIndexes.Value1dp > -1  ) ? dataLabelIndexes.Value1dp : dataLabelIndexes.DataValue;
  const pivotInputOrder = [ dataLabelIndexes.Row, dataLabelIndexes.Col, dataIndex ];
  console.log('Input order:', pivotInputOrder);

  for( let i=0; i < dataTable.length; i++ ){

    simplifiedDataTable[i] = [];
    let j = 0;
    for ( const inputIndex of pivotInputOrder ) {

      if( dataIndex === inputIndex ){ // data value/1dp

        if( dataTable[i][dataIndex].formattedValue === 'Null' ){

          simplifiedDataTable[i][j] = dataTable[i][dataLabelIndexes.DataString].formattedValue;

        } else if ( typeof dataTable[i][dataIndex].formattedValue === 'number' ){

          simplifiedDataTable[i][j] = dataTable[i][dataIndex].formattedValue;
        } else {

          simplifiedDataTable[i][j] = parseFloat(dataTable[i][dataIndex].formattedValue);
        }
      } else { // Not a data value/1dp

        simplifiedDataTable[i][j] = dataTable[i][inputIndex].formattedValue;
      }
      j++;
    }
  }
  console.log('Simple dataTable:', simplifiedDataTable);
  return simplifiedDataTable;

}; // reduceData()

function renderHtml( pivotTable, tableNumber, unit, vizIndex ) { 
  
  //npPresent = naPresent = napPresent = nilPresent = false;
  const rowHeaders = [""]; // FIX!!!
  const set1dp = true;  // FIX!!!
  const datatableNum = '1'; // FIX!!!
  let result = "<table data-unit='" + unit + "' class='table datatable mb-4'>";
  result += "<caption style='padding-bottom:0;color:#2c2c2c; font-weight:400;'>Data in figure " + tableNumber.substring(0, tableNumber.indexOf('.')) + '.' + datatableNum + " (" + unit + ")</caption><thead>";

  pivotTable.forEach((row, rowIndex) => {

    // Table header
    if ( rowIndex === 0 ) {  
      result += "<tr>";
      row.forEach((item, colIndex) => {
          if ( colIndex < rowHeaders.length ) {
              result += "<th scope='col'><span class='visually-hidden'>" + item.toString() + "</span></th>";
          } else {
              result += "<th scope='col' style='text-align: right;'>" + item.toString() + "</th>";
          }
      });
      result += "</tr></thead><tbody>";

      // Table body
    } else {  
      result += "<tr>";
      row.forEach((item, colIndex) => {

          if ( colIndex < rowHeaders.length ) {
              if ( item.rowSpan > 1 ) {  // No need to print rowspan if = 1
                  result += "<th rowspan='" + item.rowSpan + "' scope='row' class='nobr'>" + item.toString() + "</th>";
              } else {
                  result += "<th scope='row'>" + item.toString() + "</th>";
              }
          } else {
              if (item.toString() === "np") { // Check for 'np' and set for footnote
                  //npPresent = true;
              }
              if (item.toString() === "na") { // Check for 'na' and set for footnote
                  //naPresent = true;
              }
              if (item.toString() === "..") { // Check for '..' and set for footnote
                  //napPresent = true;
              }
              if (item.toString() === "0" || item.toString() === "0.0") { // Replace 0 or 0.0 with ndash and set for footnote
                  item = '&ndash;';
                  //nilPresent = true;
              } 
              if ( (set1dp) && ( (item.toString() !== '&ndash;') && (item.toString() !== '..') && (item.toString() !== 'na') && (item.toString() !== 'np') ) ) { // Set 1 decimal place for nnn.0 but not 0 or 0.0
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
  // Table footer
  // if (npPresent || naPresent || napPresent || nilPresent) {
  //     result += "<p class='small' style='margin-top:-1.0rem;'>";
  //     if (npPresent) {
  //         result += "<strong>np</strong> Not published. &nbsp;";
  //     }
  //     if (naPresent) {
  //         result += "<strong>na</strong> Not available. &nbsp;";
  //     }
  //     if (napPresent) {
  //         result += "<strong>..</strong> Not applicable. &nbsp;";
  //     }
  //     if (nilPresent) {
  //         result += "<strong>&ndash;</strong> Nil or rounded to zero. &nbsp;";
  //     }
  //     result += "</p>";
  // }
  $( `#dataTable${ vizIndex }`).html( result );

}; // renderHtml()

function pivotData( simpleDataTable ){

  // Prepare the header row
  const columnHeadings = new Set(simpleDataTable.map( (num, index, arr) => arr[index][1] ));
  const colHeadingArray = ["", ...columnHeadings]; // FIX!!!
  console.log('Column headings:', colHeadingArray);

  // Pivot the data (like crosstab) returned by the API request getSummaryDataAsync().
  const colIndex = simpleDataTable.reduce((acc, currVal) => {
    let col = currVal[0];
    if (!acc[col]) acc[col] = [];
    acc[col].push(currVal);
    return acc;
  }, {});
  
  let result = [];
  Object.keys(colIndex).map(col => {
    let values = colIndex[col].map(arr => arr[2]);
    result.push([col, ...values]);
  });

  // Insert the header row
  result.unshift(colHeadingArray);
  return result;
  
}; // pivotData()

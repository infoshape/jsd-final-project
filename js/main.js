import { 
  TableauViz,
  TableauEventType,
  FilterUpdateType,
} from "https://public.tableau.com/javascripts/api/tableau.embedding.3.latest.js";

let vizWorksheets= [];
const vizUrls = [

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

  viz.addEventListener( TableauEventType.FirstInteractive, onFirstInteractive );
  viz.addEventListener( TableauEventType.FilterChanged, onFilterChanged );
  viz.src = vizUrl;
  document.getElementById( `tableauViz${vizIndex}` ).appendChild(viz);

} // initialiseViz()

export async function getTableData( vizIndex ){

  const currentWorksheet = vizWorksheets[ vizIndex ];
  console.log('vizIndex:', vizIndex);
  console.log('currentWorksheet:', currentWorksheet);

  // Request header and data, process headers
  const dataLabelIndexes = await requestHeaderProcessColumns( currentWorksheet );
  const dataTable = await requestData( currentWorksheet ); 
  console.log('Data table:', dataTable);

  // Store off specific table values: tableNumber, unit, dataIndex, whether the data has 1 decimal place.
  const tableNumber = dataTable[0][dataLabelIndexes.TableNumber].formattedValue;
  const unit = dataTable[0][dataLabelIndexes.Unit].formattedValue;
  const dataIndex = ( dataLabelIndexes.Value1dp > -1  ) ? dataLabelIndexes.Value1dp : dataLabelIndexes.DataValue;
  const setGrp = ( dataLabelIndexes.Grp > -1  ) ? true : false;
  // const set1dp = ( dataLabelIndexes.Value1dp > -1  ) ? true : false;
  console.log('dataLabelIndexes:', dataLabelIndexes);
  console.log('Val:', dataLabelIndexes.DataValue);
  console.log('1dp:', dataLabelIndexes.Value1dp);
  
  // Data table reduce size/columns, pivot and render.
  const simplifiedDataTable = reduceData( dataTable, dataLabelIndexes, dataIndex, setGrp );
  console.log('simplifiedDataTable:', simplifiedDataTable);
  const pivotTable = pivotData( simplifiedDataTable );
  console.log('Pivot table:', pivotTable);
  renderHtml( pivotTable, tableNumber, unit, vizIndex ); // , set1dp

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

function reduceData( dataTable, dataLabelIndexes, dataIndex, setGrp ){
  // Strip the dataTable down to just the formatted values and 
  // only the input columns required for the pivot function:
  // 'Row', 'Col', 1dp/Data Value, or
  // 'Row', 'Col', 1dp/Data Value, 'Grp', 
  let simplifiedDataTable = [];
  const pivotInputOrder = setGrp ? 
  [ dataLabelIndexes.Row, dataLabelIndexes.Col, dataIndex, dataLabelIndexes.Grp ] : 
  [ dataLabelIndexes.Row, dataLabelIndexes.Col, dataIndex ];

  for( let i=0; i < dataTable.length; i++ ){
    simplifiedDataTable[i] = [];
    let j = 0;
    for( const inputIndex of pivotInputOrder ){
      if( dataIndex === inputIndex && dataTable[i][dataIndex].formattedValue === 'Null' ){ 
        // Use the string from the 'Data String' column to replace the data value since its Null.
        simplifiedDataTable[i][j] = dataTable[i][dataLabelIndexes.DataString].formattedValue;
      } else { 
        simplifiedDataTable[i][j] = dataTable[i][inputIndex].formattedValue;
      }
      j++;
    }
  }
  return simplifiedDataTable;

}; // reduceData()

function pivotData( dataTable, setGrp ){

  // Prepare the header row
  const columnHeadings = new Set(dataTable.map( ( num, index, arr ) => arr[index][1] ));
  const grpColHeadingArray = [ "", ...columnHeadings ];
  const colHeadingArray = setGrp ? 
  [ "", ...grpColHeadingArray ] : 
  [ "", ...columnHeadings ];

  // Pivot (like crosstab) the data returned by the API request getSummaryDataAsync() after being stripped back.
  const rows = dataTable.reduce( ( accumulator, currentValue ) => {

    const currentRowKey = currentValue[0];
    currentRowKey.unshift( currentValue[3] );

    if( !accumulator[currentRowKey] ){

      accumulator[currentRowKey] = [];
    } 
    accumulator[currentRowKey].push( currentValue );

    return accumulator;

  }, {});
  
  let result = [];

  Object.keys( rows ).map( rowKey => {

    const dataValues = rows[rowKey].map( array => array[2] );

    result.push( [ rowKey, ...dataValues ] );

  });

  // Insert the header row
  result.unshift( colHeadingArray );
  return result;
  
}; // pivotData()

function renderHtml( pivotTable, tableNumber, unit, vizIndex, rowHeaders=["Description5"]  ){  // , set1dp
  
  let present = {};
  const rowSpan = rows =>
    rows.map((row, rowIndex) =>
      row.map((item, colIndex) => ({
          data: item,
          rowSpan: countRows(rows, rowIndex, colIndex)
      }))
    );
  
  const countRows = (rows, rowIndex, colIndex) => {
    if (colIndex === 0) { // Only group 1st column
      if (rowIndex > 0 && rows[rowIndex - 1][colIndex] === rows[rowIndex][colIndex]) {
        return 0;
      }
    }
    let count = 1;
    if (colIndex === 0) { // Only group 1st column
      while (count + rowIndex < rows.length && rows[rowIndex + count][colIndex] === rows[rowIndex][colIndex]) {
        count++;
      }
    }
    return count;
  };

  const datatableNum = '1';
  let result = "<table data-unit='" + unit + "' class='table datatable mb-4'>";
  result += "<caption style='padding-bottom:0;color:#2c2c2c; font-weight:400;'>Data in figure " + tableNumber.substring(0, tableNumber.indexOf('.')) + '.' + datatableNum + " (" + unit + ")</caption><thead>";
  rowSpan(pivotTable).forEach((row, rowIndex) => {
    if ( rowIndex === 0 ) {  // Table header
      result += "<tr>";
      row.forEach((item, colIndex) => {
        if ( colIndex < rowHeaders.length ) {
          result += "<th scope='col'><span class='visually-hidden'>" + item.data.toString() + "</span></th>";
        } else {
          result += "<th scope='col' style='text-align: right;'>" + item.data.toString() + "</th>";
        }
      });
      result += "</tr></thead><tbody>";
    } else {  // Table body
      result += "<tr>";
      row.forEach((item, colIndex) => { // Row header/s
        if (item.rowSpan) {
          if ( colIndex < rowHeaders.length ) {
            if ( item.rowSpan > 1 ) {  // No need to print rowspan if = 1
              result += "<th rowspan='" + item.rowSpan + "' scope='row' class='nobr'>" + item.data.toString() + "</th>";
            } else {
              result += "<th scope='row'>" + item.data.toString() + "</th>";
            }
          } else { // Data values
            present = legendPresent( item.data.toString(), present );

            if ( item.data.toString() === "0" || item.data.toString() === "0.0" ) { 
              // Replace 0 or 0.0 with ndash
              result += "<td style='text-align: right;'>&ndash;</td>";
            } else {
              result += "<td style='text-align: right;'>" + item.data.toString() + "</td>";
            }
          }
        }
      });
      result += "</tr>";
    }
  });
  result += "</tbody></table>";
  result += renderLegend( present );

  $( `#dataTable${ vizIndex }` ).html( result );

}; // renderHtml()

function legendPresent( string, present ){
  
  // Check for presence of special cases and set for footnote
  return string === "np" ? { ...present, ...{ np: true } }
  : string === "na" ? { ...present, ...{ na: true } }
  : string === ".." ? { ...present, ...{ nap: true } }
  : ( string === "0" || string === "0.0" ) ? { ...present, ...{ nil: true } }
  : Object.assign({}, present); // leave object intact

}; // legendPresent()

function renderLegend( present ){

  let legendHtml = '';
  if( Object.values( present ).some( val => val === true ) ){
    legendHtml += "<p class='small' style='margin-top:-1.0rem;'>";
    legendHtml = 
    present.np ? legendHtml + "<strong>np</strong> Not published. &nbsp;"
    : present.na ? legendHtml + "<strong>na</strong> Not available. &nbsp;"
    : present.nap ? legendHtml + "<strong>..</strong> Not applicable. &nbsp;"
    : present.nil ? legendHtml + "<strong>&ndash;</strong> Nil or rounded to zero. &nbsp;"
    : legendHtml; // leave result unchanged
  }
  return legendHtml += "</p>";

}; // renderLegend()

export async function filter( filterName, filterValue ){
  // Called by HTML buttons to filter all visualisations but getting data table updated is handled by onFilterChanged().
  for( let i=0; i < vizWorksheets.length; i++ ){ 
    const filterValueArray = Array.of( filterValue );
    await vizWorksheets[i].applyFilterAsync(filterName, filterValueArray, FilterUpdateType.Replace);
  };
}; // filter() Two filters: "Jurisdiction" or "Indigenous Status"

function onFilterChanged( ev ){
  
  // Listener event called if a filter is changed: either on-chart or via HTML button.
  const vizIndex = ev.target.parentElement.id.replace( 'tableauViz', '' );
  getTableData( vizIndex );
  console.log('on-filter changed! - getsData');

}; // onFilterChanged()
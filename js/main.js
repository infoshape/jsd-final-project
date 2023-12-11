import { 
  TableauViz,
  TableauEventType,
} from "https://public.tableau.com/javascripts/api/tableau.embedding.3.latest.js";

export const vizUrls = [
  //"https://public.tableau.com/views/2023_CtG16_CultureLanguage_Supp/FigureSE16e_2",
  "https://public.tableau.com/views/CtG04_EarlyYears_Disaggs_2023/FigureCtG4_5",
  "https://public.tableau.com/views/2023_CtG06_EducationPathways_Supp/FigureSE6a_1",
  "https://public.tableau.com/views/2023_CtG06_EducationPathways_Supp/FigureSE6a_2",
  "https://public.tableau.com/views/2023_CtG06_EducationPathways_Supp/FigureSE6a_3"
] // vizzes

export function initialiseViz( vizIndex, vizUrl ) {
  const viz = new TableauViz();
  viz.hideTabs = true;

  const onFirstInteractive = () => {
    getTableData( viz, 'default' );
  };
  viz.addEventListener(TableauEventType.FirstInteractive, onFirstInteractive);
  viz.src = vizUrl;
  document.getElementById(`tableauViz${vizIndex}`).appendChild(viz);
} // initialiseViz()

export async function getTableData( viz, htmlTable = 'current' ){
  let simpleDataTable = [];
  const currentWorksheet = viz.workbook.activeSheet.worksheets[0];
  const dataHeader = await currentWorksheet.getSummaryColumnsInfoAsync();
  const dataLabelIndexes = processHeaders( dataHeader );
  console.log('Data labels:', dataLabelIndexes);
  const summaryDataOptions = {
      maxRows: 0,
      ignoreAliases: false,
      ignoreSelection: true,
      includeDataValuesOption: 'only-formatted-values',
  };
  const summaryData = await currentWorksheet.getSummaryDataAsync(summaryDataOptions);
  const dataTable = summaryData.data;
  console.log('Data table:', dataTable);

  const tableNumber = dataTable[0][dataLabelIndexes.TableNumber].formattedValue;
  const unit = dataTable[0][dataLabelIndexes.Unit].formattedValue;
  console.log('Val:', dataLabelIndexes.DataValue);
  console.log('1dp:', dataLabelIndexes.Value1dp);
  const dataIndex = ( dataLabelIndexes.Value1dp > -1  ) ? dataLabelIndexes.Value1dp : dataLabelIndexes.DataValue;
  const pivotInputOrder = [ dataLabelIndexes.Row, dataLabelIndexes.Col, dataIndex ];
  
  console.log('Input order:', pivotInputOrder);

  for( let i=0; i < dataTable.length; i++ ){
    simpleDataTable[i] = [];
    let j = 0;
    for ( const inputIndex of pivotInputOrder ) {
      if( dataIndex === inputIndex ){ // data value/1dp
        if( dataTable[i][dataIndex].formattedValue === 'Null' ){
          simpleDataTable[i][j] = dataTable[i][dataLabelIndexes.DataString].formattedValue;
        } else if ( typeof dataTable[i][dataIndex].formattedValue === 'number' ){
          simpleDataTable[i][j] = dataTable[i][dataIndex].formattedValue;
        } else {
          simpleDataTable[i][j] = parseFloat(dataTable[i][dataIndex].formattedValue);
        }
      } else { // Not a data value/1dp
        simpleDataTable[i][j] = dataTable[i][inputIndex].formattedValue;
      }
      j++;
    }
  }
  console.log('Simple dataTable:', simpleDataTable);
  const columnHeadings = new Set(simpleDataTable.map( (num, index, arr) => arr[index][1] ));
  const colHeadingArray = ["", ...columnHeadings];
  console.log('Column headings:', colHeadingArray);
  const pivotTable = pivotData( simpleDataTable );
  pivotTable.unshift(colHeadingArray); // Insert the header row
  console.log('Pivot table:', pivotTable);
  pivotToHTMLwithRowpan( pivotTable, tableNumber, unit, ["Description5"] );

}; // getTableData()

function pivotToHTMLwithRowpan( pivotTable, tableNumber, unit, rowHeaders=["Description5"] ) { // With rowspan | , datatableNum, target, rowHeaders
  //npPresent = naPresent = napPresent = nilPresent = false;
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
  const set1dp = true;
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
      row.forEach((item, colIndex) => {
        if (item.rowSpan) {
          if ( colIndex < rowHeaders.length ) {
              if ( item.rowSpan > 1 ) {  // No need to print rowspan if = 1
                  result += "<th rowspan='" + item.rowSpan + "' scope='row' class='nobr'>" + item.data.toString() + "</th>";
              } else {
                  result += "<th scope='row'>" + item.data.toString() + "</th>";
              }
          } else {
              if (item.data.toString() === "np") { // Check for 'np' and set for footnote
                  //npPresent = true;
              }
              if (item.data.toString() === "na") { // Check for 'na' and set for footnote
                  //naPresent = true;
              }
              if (item.data.toString() === "..") { // Check for '..' and set for footnote
                  //napPresent = true;
              }
              if (item.data.toString() === "0" || item.data.toString() === "0.0") { // Replace 0 or 0.0 with ndash and set for footnote
                  item.data = '&ndash;';
                  //nilPresent = true;
              } 
              if ( (set1dp) && ( (item.data.toString() !== '&ndash;') && (item.data.toString() !== '..') && (item.data.toString() !== 'na') && (item.data.toString() !== 'np') ) ) { // Set 1 decimal place for nnn.0 but not 0 or 0.0
                  result += "<td style='text-align: right;'>" + item.data.toFixed(1).toLocaleString('en-US') + "</td>";
              } else {
                  result += "<td style='text-align: right;'>" + item.data.toLocaleString('en-US') + "</td>";
              }
          }
        }
      });
      result += "</tr>";
    }
  });
  result += "</tbody></table>";
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
  $('#dataTable1').html(result);
}

function pivotData( simpleDataTable ){

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
  
    return result;
    
  }; // pivotData()

function processHeaders( dataHeader ){

  let dataLabelIndexes = {};
  const labels = ["Grp", "Row", "Col", "Data String", "Unit", "Table Number", "(Data Value)", "Value (1dp)"];
  const dataLabels  = dataHeader.map( h => h.fieldName );

  for( let i=0; i < labels.length; i++ ){
    const currentDataLabel = findColumn( labels[i], dataLabels );
    if( currentDataLabel > -1 ){
      dataLabelIndexes[ labels[i].replace(/[\s\(\)]/g, '') ] = currentDataLabel;  // regex removes spaces and brackets
    }
  }
  return dataLabelIndexes; 

}; // pivotTableInputs()

function findColumn( string, array ){ // returns -1 if not found
  return array.findIndex( i => i.includes( string ) )
}; // findColumn()

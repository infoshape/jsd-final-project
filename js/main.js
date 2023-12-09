import { 
  TableauViz,
  TableauEventType
} from "https://public.tableau.com/javascripts/api/tableau.embedding.3.latest.js";

export const vizUrls = [
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
  const pivotInputOrder = [ dataLabelIndexes.Row, dataLabelIndexes.Col, dataLabelIndexes.DataValue ];
  console.log('Input order:', pivotInputOrder);

  // const simpleDataTaqble = dataTable.map( f => f.formattedValue );
  console.log('dataTable length:', dataTable.length);
  for( let i=0; i < dataTable.length; i++ ){
    simpleDataTable[i] = [];
    let j = 0;
    for ( const inputIndex of pivotInputOrder ) {
      if( dataLabelIndexes.DataValue === inputIndex ){ // data value/1dp
        if( dataTable[i][inputIndex].formattedValue === 'Null' ){
          simpleDataTable[i][j] = dataTable[i][dataLabelIndexes.DataString].formattedValue;
        } else if ( typeof dataTable[i][inputIndex].formattedValue === 'number' ){
          simpleDataTable[i][j] = dataTable[i][inputIndex].formattedValue;
        } else {
          simpleDataTable[i][j] = parseFloat(dataTable[i][inputIndex].formattedValue);
        }
      } else { // Not a data value/1dp
        simpleDataTable[i][j] = dataTable[i][inputIndex].formattedValue;
      }
      j++;
    }
  }
  console.log('Simple dataTable:', simpleDataTable);

}; // getTableData()

function processHeaders( dataHeader ){

  let dataLabelIndexes = {};
  const labels = ["Grp", "Row", "Col", "Data String", "Unit", "Table Number", "Data Value", "1dp"];
  const dataLabels  = dataHeader.map( h => h.fieldName );

  for( let i=0; i < labels.length; i++ ){
    const currentDataLabel = findColumn( labels[i], dataLabels );
    if( currentDataLabel > -1 ){
      dataLabelIndexes[ labels[i].replace(/\s/g, '') ] = currentDataLabel;
    }
  }
  return dataLabelIndexes; 

}; // pivotTableInputs()

function findColumn( string, array ){ // returns -1 if not found
  return array.findIndex( i => i.includes( string ) )
}

import {
  FilterUpdateType,
  TableauDialogType,
  TableauEventType,
  SelectionUpdateType,
  SheetSizeBehavior,
} from "https://public.tableau.com/javascripts/api/tableau.embedding.3.latest.js";

////////////////////////////////////////////////////////////////////////////////
// Global Variables

let viz, workbook, activeSheet;

////////////////////////////////////////////////////////////////////////////////
// 1 - Create a View

export function initializeViz() {
  viz = document.getElementById("viz");
  viz.height = '657px';
  viz.width = '100%';
  // viz.hideTabs = true;
  viz.hideToolbar = true;

  const onFirstInteractive = () => {
    workbook = viz.workbook;
    activeSheet = workbook.activeSheet;
  };

  viz.addEventListener(TableauEventType.FirstInteractive, onFirstInteractive);
  viz.src = "https://public.tableau.com/views/Jul2024_CtG09_Housing_Supp/FigureSE9e_3";
  //"https://public.tableau.com/views/DeveloperSuperstore/Overview";
  //"https://public.tableau.com/views/Jul2024_CtG09_Housing_Supp/FigureSE9e_3"; //"https://public.tableau.com/views/2023_CtG06_EducationPathways_Supp/FigureSE6c_1";
  
  // "https://public.tableau.com/views/2023_CtG06_EducationPathways_Supp/FigureSE6a_1";

}

////////////////////////////////////////////////////////////////////////////////
// 2 - Filter

export async function filterSingleValue() {
  await activeSheet.applyFilterAsync("Region", ["The Americas"], FilterUpdateType.Replace);
}

export async function addValuesToFilter() {
  await activeSheet.applyFilterAsync("Region", ["Europe", "Middle East"], FilterUpdateType.Add);
}

export async function removeValuesFromFilter() {
  await activeSheet.applyFilterAsync("Region", ["Europe"], FilterUpdateType.Remove);
}

export async function filterRangeOfValues() {
  await activeSheet.applyRangeFilterAsync(
    "F: GDP per capita (curr $)",
    {
      min: 40000,
      max: 60000,
    },
    FilterUpdateType.Replace
  );
}

export async function clearFilters() {
  await activeSheet.clearFilterAsync("Region");
  await activeSheet.clearFilterAsync("F: GDP per capita (curr $)");
}

////////////////////////////////////////////////////////////////////////////////
// 3 - Switch Tabs

export async function switchToMapTab() {
  await workbook.activateSheetAsync("GDP per capita map");
}

////////////////////////////////////////////////////////////////////////////////
// 4 - Select

export async function selectSingleValue() {
  const selections = [
    {
      fieldName: "Region",
      value: "Asia",
    },
  ];

  await workbook.activeSheet.selectMarksByValueAsync(selections, SelectionUpdateType.Replace);
}

export async function addValuesToSelection() {
  const selections = [
    {
      fieldName: "Region",
      value: ["Africa", "Oceania"],
    },
  ];

  await workbook.activeSheet.selectMarksByValueAsync(selections, SelectionUpdateType.Add);
}

export async function removeFromSelection() {
  // Remove all of the areas where the GDP is < 5000.
  const selections = [
    {
      fieldName: "AVG(F: GDP per capita (curr $))",
      value: {
        min: 0,
        max: 5000,
      },
    },
  ];

  await workbook.activeSheet.selectMarksByValueAsync(selections, SelectionUpdateType.Remove);
}

export async function clearSelection() {
  await workbook.activeSheet.clearSelectedMarksAsync();
}

////////////////////////////////////////////////////////////////////////////////
// 5 - Chain Calls

export async function switchTabsThenFilterThenSelectMarks() {
  const newSheet = await workbook.activateSheetAsync("GDP per capita by region");
  activeSheet = newSheet;

  // It's important to await the promise so the next step
  // won't be called until the filter completes.
  await activeSheet.applyRangeFilterAsync(
    "Date (year)",
    {
      min: new Date(Date.UTC(2002, 1, 1)),
      max: new Date(Date.UTC(2008, 12, 31)),
    },
    FilterUpdateType.Replace
  );

  const selections = [
    {
      fieldName: "AGG(GDP per capita (weighted))",
      value: {
        min: 20000,
        max: Infinity,
      },
    },
  ];

  return await activeSheet.selectMarksByValueAsync(selections, SelectionUpdateType.Replace);
}

export async function triggerError() {
  await workbook.activateSheetAsync("GDP per capita by region");

  // Do something that will cause an error.
  try {
    await activeSheet.applyFilterAsync("Date (year)", [2008], "invalid");
  } catch (err) {
    alert(`We purposely triggered this error to show how error handling happens.\n\n${err}`);
  }
}

////////////////////////////////////////////////////////////////////////////////
// 6 - Sheets

function getSheetsAlertText(sheets) {
  const alertText = [];

  for (let i = 0, len = sheets.length; i < len; i++) {
    const sheet = sheets[i];
    alertText.push(`  Sheet ${i}`);
    alertText.push(` (${sheet.sheetType})`);
    alertText.push(` - ${sheet.name}`);
    alertText.push("\n");
  }

  return alertText.join("");
}

export function querySheets() {
  const sheets = workbook.publishedSheetsInfo;
  let text = getSheetsAlertText(sheets);
  text = `Sheets in the workbook:\n${text}`;
  alert(text);
}

export async function queryDashboard0() {
  // Notice that the filter is still applied on the "GDP per capita by region"
  // worksheet in the dashboard, but the marks are not selected.
  const dashboard = await workbook.activateSheetAsync("Select filters");
  const worksheets = dashboard.worksheets;
  let text = getSheetsAlertText(worksheets);
  text = "Worksheets in the dashboard:\n" + text;
  alert(text);
}
export async function queryDashboard1() {
  // Notice that the filter is still applied on the "GDP per capita by region"
  // worksheet in the dashboard, but the marks are not selected.
  const dashboard = await workbook.activateSheetAsync("Figure SE6a.1");
  const worksheets = dashboard.worksheets;
  let text = getSheetsAlertText(worksheets);
  text = "Worksheets in the dashboard:\n" + text;
  alert(text);
}

export async function changeDashboardSize() {
  const dashboard = await workbook.activateSheetAsync("GDP per Capita Dashboard");
  await dashboard.changeSizeAsync({
    behavior: SheetSizeBehavior.Automatic,
  });
}

export async function changeDashboard() {
  var alertText = [
    "After you click OK, the following things will happen: ",
    "  1) Region will be set to Middle East.",
    "  2) On the map, the year will be set to 2010.",
    "  3) On the bottom worksheet, the filter will be cleared.",
    "  4) On the bottom worksheet, Region will be set to Middle East.",
  ];
  alert(alertText.join("\n"));

  const dashboard = await workbook.activateSheetAsync("GDP per Capita Dashboard");
  const mapSheet = dashboard.worksheets.find((w) => w.name === "Map of GDP per capita");
  const graphSheet = dashboard.worksheets.find((w) => w.name === "GDP per capita by region");

  await mapSheet.applyFilterAsync("Region", ["Middle East"], FilterUpdateType.Replace);

  // Do these two steps in parallel since they work on different sheets.
  await Promise.all([
    mapSheet.applyFilterAsync("YEAR(Date (year))", [2010], FilterUpdateType.Replace),
    graphSheet.clearFilterAsync("Date (year)"),
  ]);

  const selections = [
    {
      fieldName: "Region",
      value: "Middle East",
    },
  ];

  return await graphSheet.selectMarksByValueAsync(selections, SelectionUpdateType.Replace);
}

////////////////////////////////////////////////////////////////////////////////
// 7 - Control the Toolbar

export async function exportPDF() {
  await viz.displayDialogAsync(TableauDialogType.ExportPDF);
}

export async function exportImage() {
  await viz.exportImageAsync();
}

export async function exportCrossTab() {
  await viz.displayDialogAsync(TableauDialogType.ExportCrossTab);
}

export async function exportData() {
  await viz.displayDialogAsync(TableauDialogType.ExportData);
}

export async function revertAll() {
  await workbook.revertAllAsync();
}

////////////////////////////////////////////////////////////////////////////////
// 8 - Events

export function listenToMarksSelection() {
  viz.addEventListener(TableauEventType.MarkSelectionChanged, onMarksSelection);
}

export async function onMarksSelection(marksEvent) {
  const marks = await marksEvent.detail.getMarksAsync();
  reportSelectedMarks(marks);
}

export function reportSelectedMarks(marks) {
  let html = [];
  marks.data.forEach((markDatum) => {
    const marks = markDatum.data.map((mark, index) => {
      return {
        index,
        pairs: mark.map((dataValue, dataValueIndex) => {
          return {
            fieldName: markDatum.columns[dataValueIndex].fieldName,
            formattedValue: dataValue.formattedValue,
          };
        }),
      };
    });

    marks.forEach((mark) => {
      html.push(`<b>Mark ${mark.index}:</b><ul>`);

      mark.pairs.forEach((pair) => {
        html.push(`<li><b>fieldName:</b> ${pair.fieldName}`);
        html.push(`<br/><b>formattedValue:</b> ${pair.formattedValue}</li>`);
      });

      html.push("</ul>");
    });
  });

  const dialog = $("#dialog");
  dialog.html(html.join(""));
  dialog.dialog("open");
}

export function removeMarksSelectionEventListener() {
  viz.removeEventListener(TableauEventType.MarkSelectionChanged, onMarksSelection);
}

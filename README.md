# TABLEAU VISUALISATIONS - FINAL PROJECT

## Table of Contents

- **[App](#app-toc)**
- **[Overview](#overview-toc)**
- **[Planning stage](#planning-stage-toc)**
- **[Screenshot](#screenshot-toc)**
- **[What I learned](#what-i-learned-toc)**
- **[Other technology](#other-technology-toc)**
- **[Wishlist/Future features](#wishlistfuture-features-toc)**
  

## App [<sup><sup><sup>[TOC]</sup></sup></sup>](#table-of-contents)

The App is [Tableau visualisations: Dashboard](https://infoshape.github.io/jsd-final-project/).

The diagnostic page that was used to develop the App is [Tableau JavaScript API v3 testing](https://infoshape.github.io/jsd-final-project/diags.html).

## Overview [<sup><sup><sup>[TOC]</sup></sup></sup>](#table-of-contents)

Tableau JavaScript API v3 to embed multiple visualisations into one webpage with a common set of HTML filter buttons to control them via the API.  The API is also used to extract the underlying data of visualisations to produce an accessible data table alternative and to control the data presented via use of filters. 

## Planning stage [<sup><sup><sup>[TOC]</sup></sup></sup>](#table-of-contents)

The following illustration shows the structure of the underlying data returned by the Tableau JavaScript API and how its converted using a pivot function to produce the data table presented:<br />
![Data conversion required](pivot-col.png?raw=true "The data conversion that occurs using the pivot function")

## Screenshot [<sup><sup><sup>[TOC]</sup></sup></sup>](#table-of-contents)

![App screenshot](screenshot1.png?raw=true "Capture showing HTML filter buttons, viz and data table")

## What I learned [<sup><sup><sup>[TOC]</sup></sup></sup>](#table-of-contents)

- Its a little different handling a JavaScript module, namely, the Tableau JavaScript API **v3**.
- Using Async/await is better/easier to use than Promises.

## Other technology [<sup><sup><sup>[TOC]</sup></sup></sup>](#table-of-contents)

| Technology                    | Description                                              |
| -------------------------- | -------------------------------------------------------- |
| `JavaScript module`                      | Tableau JS API v3                           |
| `jQuery`        | JavaScript library                                           |
| `Bootstrap 5`                       | Frontend framework/ <br />dashboard template                               |


## Wishlist/Future features [<sup><sup><sup>[TOC]</sup></sup></sup>](#table-of-contents)

- A button to display the data tables, as opposed to automatically displaying on load.
- A dynamically generated table legend based on the data presented in the specific data table.
- Customisation options for row and column sorting and/or ordering to deal with underlying data issues.
- Customisation to allow exclusion of specific visualisations from the effect of the common HTML filter buttons.
- Spanning rows in the data table when the data is grouped.
- JavaScript generated filter buttons to allow for custom setting and the option to turn off one set or both sets.
- A hidden PNG alternative for the embedded Tableau visualisation, which is used when printing.
- Share and export options via HTML buttons.


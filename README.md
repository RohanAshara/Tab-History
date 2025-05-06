this is a Chrome extension designed to track and visualize your browsing history within individual tabs. It captures the sequence of pages visited in each tab and presents this information through an interactive chart, allowing users to navigate their tab history more intuitively.

### Features

* **Per-Tab History Tracking**: Monitors and records the navigation history specific to each browser tab.
* **Visual Representation**: Utilizes `chart.js` to display the tab history in a user-friendly chart format.
* **Popup Interface**: Provides a popup (`popup.html`) that showcases the visual history when the extension icon is clicked.
* **Efficient Background Processing**: Employs `background.js` and `content.js` scripts to manage data collection and communication between the browser and the extension interface.

### Installation

1. Clone or download the repository:

   ```bash
   git clone https://github.com/RohanAshara/Tab-History.git
   ```


2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" using the toggle in the top right corner.
4. Click on "Load unpacked" and select the cloned `Tab-History` directory.
5. The extension should now appear in your browser's extension list.([GitHub][1])

### Usage

* Click on the Tab History extension icon in the Chrome toolbar to open the popup interface.
* The popup will display a chart illustrating the navigation history of the current tab.
* Use the chart to revisit previously viewed pages within the same tab.([crxinsider.com][2])

### Technologies Used

* **JavaScript**: Core scripting language for extension functionality.
* **HTML & CSS**: Structure and styling of the popup interface.
* **Chart.js**: Library used for rendering the visual representation of tab history.([GitHub][3])

This extension is particularly useful for users who frequently navigate through multiple pages within a single tab and wish to have a visual overview of their browsing path.

Feel free to customize this description further to match the specific details and functionalities of your extension.

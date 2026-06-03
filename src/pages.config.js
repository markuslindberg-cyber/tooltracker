import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import InventoryCheck from './pages/InventoryCheck';
import Locations from './pages/Locations';
import Team from './pages/Team';
import Transfers from './pages/Transfers';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Inventory": Inventory,
    "InventoryCheck": InventoryCheck,
    "Locations": Locations,
    "Team": Team,
    "Transfers": Transfers,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
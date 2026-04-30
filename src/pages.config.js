import Dashboard from './pages/Dashboard';
import History from './pages/History';
import OperationalExpenses from './pages/OperationalExpenses';
import Quotes from './pages/Quotes';
import Services from './pages/Services';
import Settings from './pages/Settings';
import __Layout from './Layout.jsx';


export const PAGES = {
      "Dashboard": Dashboard,
      "History": History,
      "OperationalExpenses": OperationalExpenses,
      "Quotes": Quotes,
      "Services": Services,
      "Settings": Settings,
}

export const pagesConfig = {
      mainPage: "Dashboard",
      Pages: PAGES,
      Layout: __Layout,
};

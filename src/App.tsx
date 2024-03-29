import { useEffect, useState } from "react";
import Product from "./features/products/Product";

function App() {
  const [menuValue, setMenuValue] = useState("");

  const getTabTitle = async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    setMenuValue(tab.title!.toUpperCase());
  };

  useEffect(() => {
    getTabTitle();
  }, []);

  if (menuValue.includes("PRODUCT") || menuValue.includes("PRODUCTS")) {
    return <Product />;
  } else {
    return (
      <div>
        <h3>Function for this {menuValue} item is not supported yet</h3>
        <h3>Support only: Products</h3>
      </div>
    );
  }
}

export default App;

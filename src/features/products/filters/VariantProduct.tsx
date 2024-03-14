import { useEffect, useState } from "react";

const sessionInputVariantProduct = "input_variant_product";
const sessionTotalVariantProducts = "total_variant_products";
const tabConnectFetchAllVariantProducts = "fetchAllVariantProducts";
const tabConnectVariantProductCurPage = "variantProductCurPage";

const inputVariantProductPattern = /^(n\/a|\d+\/\d+)$/i;

export default function VariantProduct() {
  const [tabId, setTabId] = useState(0);
  const [data, setData] = useState<{}>({});
  const [totalRecords, setTotalRecords] = useState(0);
  const [variantProductCurPage, setVariantProductCurPage] = useState<string[]>([]);
  const [variantProductAllPage, setVariantProductAllPage] = useState(0);
  const [inputVariantProduct, setInputVariantProduct] = useState("");
  const [previousInputVariantProduct, setPreviousInputVariantProduct] = useState("");

  const highlightVariantProductCurPage = (state: "change_background" | "reset") => {
    chrome.tabs.connect(tabId, { name: tabConnectVariantProductCurPage }).postMessage({
      state: state,
      [tabConnectVariantProductCurPage]: variantProductCurPage,
    });
  };

  const setInput = (value: string) => {
    setPreviousInputVariantProduct(inputVariantProduct);
    setInputVariantProduct(value);
    chrome.storage.session.set({ [sessionInputVariantProduct]: value });
  }

  const matchInputAndVariantProducts = (item: any, input: string): boolean => {
    const splitTotalComplete = input.split("/");
    if (Array.isArray(item.complete_variant_products) && input.toUpperCase().includes('N/A')) {
      return true;
    } else if (
      item.complete_variant_products.complete === Number(splitTotalComplete[0]) &&
      item.complete_variant_products.total === Number(splitTotalComplete[1])
    ) {
      return true;
    }
    return false;
  };

  const processDataFromContentScript = (data: any, input: string) => {
    const result = [] as string[];
    data.forEach((item: any) => {
      if (matchInputAndVariantProducts(item, input)) {
        result.push(item.label);
      }
    });
    return result;
  }

  const countAllVariantProducts = () => {
    chrome.storage.session.get(
      sessionTotalVariantProducts,
      (session) => {
        if (Object.keys(session).length > 0) {
          setVariantProductAllPage(session[sessionTotalVariantProducts]);
        } else {
          chrome.tabs
            .connect(tabId, { name: tabConnectFetchAllVariantProducts })
            .postMessage(inputVariantProduct);
        }
      }
    );
  };

  const getSessionStorageFromWebsite = () => {
    chrome.tabs.sendMessage(tabId, {name: "getSessionStorage"}, (session) => {
      const result = session!.data ? JSON.parse(session.data) : undefined;
      const data = result!.data ?? {};
      const totalRecords = result!.totalRecords ?? 0;

      setData(data);
      setTotalRecords(totalRecords);
    });
  }

  const reset = () => {
    chrome.storage.session.remove(sessionTotalVariantProducts);
    highlightVariantProductCurPage("reset");
    setData({});
    setVariantProductCurPage([]);
    setVariantProductAllPage(0);
  }

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      setTabId(tabs[0].id ?? 0);
    });

    chrome.storage.session.get(sessionInputVariantProduct, (session: any) => {
      const value = Object.keys(session).length > 0 ? session[sessionInputVariantProduct] : "";
      setPreviousInputVariantProduct(value);
      setInputVariantProduct(value);
    });

    chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
      // runtime connect: fetchAllVariantProducts
      if (message.name === "processVariantProduct") {
        if (Object.keys(message.data.data).length > 0) {
          setVariantProductAllPage((e) => e + processDataFromContentScript(message.data.data, message.input).length);
        }
        sendResponse();
      }
    });
  }, []);

  useEffect(() => {
    if (inputVariantProduct !== previousInputVariantProduct) {
      reset();
    }

    if (inputVariantProduct.length > 0 && inputVariantProduct.match(inputVariantProductPattern)) {
      getSessionStorageFromWebsite();
    }
  }, [inputVariantProduct]);

  useEffect(() => {
    if (Object.keys(data).length > 0) {
      setVariantProductCurPage(processDataFromContentScript(data, inputVariantProduct));
      countAllVariantProducts();
    }
  }, [data]);

  useEffect(() => {
    if (variantProductCurPage.length > 0) {
      highlightVariantProductCurPage("change_background");
    }
  }, [variantProductCurPage]);

  useEffect(() => {
    if (variantProductAllPage > 0) {
      chrome.storage.session.get(sessionTotalVariantProducts, (session) => {
        if (Object.keys(session).length === 0 || session[sessionTotalVariantProducts] < variantProductAllPage) {
          chrome.storage.session.set({
            [sessionTotalVariantProducts]: variantProductAllPage,
          });
        }
      })
    }
  }, [variantProductAllPage]);

  return (
    <table className="table align-middle">
      <tbody>
        <tr>
          <td className="text-start">
            Variant products {inputVariantProduct} on this page
          </td>
          <td>{variantProductCurPage.length}</td>
        </tr>
        <tr>
          <td className="text-start">
            Variant products {inputVariantProduct} on all pages
          </td>
          <td>{variantProductAllPage}</td>
        </tr>
        <tr>
          <td className="text-start">Total Records</td>
          <td>{totalRecords}</td>
        </tr>
        <tr>
          <td colSpan={2}>
            <div className="row row-cols-auto flex-row justify-content-evenly">
              <label htmlFor="variant_product">Search: </label>
              <input
                id="variant_product"
                type="text"
                defaultValue={inputVariantProduct}
                placeholder="N/A or digit/digit"
                required
                pattern={inputVariantProductPattern.source}
                style={{
                  borderColor:
                    inputVariantProduct.length <= 0 ||
                    inputVariantProduct.match(inputVariantProductPattern)
                      ? ""
                      : "red",
                }}
                onChange={(e) => {
                  setInput(e.target.value);
                }}
              />
            </div>
          </td>
        </tr>
        <tr>
          <td colSpan={2}>
            <div className="row row-cols-auto flex-row justify-content-evenly">
              <button type="button" onClick={() => {setInput(""); (document.getElementById('variant_product') as HTMLInputElement).value = '';}}>
                Reset
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

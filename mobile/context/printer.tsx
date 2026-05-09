import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  Printer,
  PrinterConstants,
  usePrintersDiscovery,
} from "react-native-esc-pos-printer";
import {
  Order,
  PrinterTypes,
  PrinterStatus,
  UsePrinterReturn,
} from "@/types/api";

const PrinterContext = createContext<UsePrinterReturn | null>(null);

export function PrinterProvider({ children }: { children: React.ReactNode }) {
  const { start, isDiscovering, printers, printerError } =
    usePrintersDiscovery();
  const [status, setStatus] = useState<PrinterStatus>("idle");
  const [savedPrinter, setSavedPrinter] = useState<PrinterTypes | null>(null);

  const printerInstance = useMemo(
    () =>
      new Printer({
        target: savedPrinter?.target || "",
        deviceName: savedPrinter?.deviceName || "",
      }),
    [savedPrinter],
  );

  const storeData = async (key: string, value: PrinterTypes) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.log("Error storing data", e);
    }
  };

  const getData = async (key: string) => {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (e) {
      console.log("Error getting data", e);
    }
  };

  const checkConnection = async (printer: PrinterTypes): Promise<boolean> => {
    try {
      const instance = new Printer({
        target: printer.target,
        deviceName: printer.deviceName,
      });
      await instance.connect(3000);
      const s = await instance.getStatus();
      await instance.disconnect();
      return s?.online?.statusCode === PrinterConstants.TRUE;
    } catch {
      return false;
    }
  };

  const scan = () => {
    start();
  };

  const connect = async (printer: PrinterTypes) => {
    try {
      setStatus("connecting");
      const instance = new Printer({
        target: printer.target,
        deviceName: printer.deviceName,
      });
      await instance.connect();
      await storeData("printer", printer);
      setSavedPrinter(printer);
      setStatus("connected");
      await instance.disconnect();
    } catch (error) {
      console.error("Error connecting to printer", error);
      setStatus("error");
    }
  };

  const disconnect = async () => {
    if (savedPrinter) {
      await AsyncStorage.removeItem("printer");
      setSavedPrinter(null);
      setStatus("idle");
    }
  };

  const printTest = async () => {
    if (!savedPrinter || status !== "connected") return;

    try {
      const res = await printerInstance.addQueueTask(async () => {
        await Printer.tryToConnectUntil(
          printerInstance,
          (status) => status.online.statusCode === PrinterConstants.TRUE,
        );

        await printerInstance.addText("Hello World");
        await printerInstance.addFeedLine(3);
        await printerInstance.addCut();

        const result = await printerInstance.sendData();
        await printerInstance.disconnect();
        return result;
      });
      if (res) {
        console.log(res);
      }
    } catch (error) {
      console.error("Error printing test", error);
      await printerInstance.disconnect();
      setStatus("error");
    }
  };

  const printOrder = async (order: Order) => {
    if (!savedPrinter || status !== "connected") return;

    try {
      await printerInstance.addQueueTask(async () => {
        await Printer.tryToConnectUntil(
          printerInstance,
          (s) => s.online.statusCode === PrinterConstants.TRUE,
        );

        await printerInstance.addTextAlign(PrinterConstants.ALIGN_CENTER);
        await printerInstance.addTextSize(2, 2);
        await printerInstance.addText(
          `#${order.orderNumber ?? order.id.slice(0, 6)}\n`,
        );
        await printerInstance.addTextSize(1, 1);
        if (order.fullName)
          await printerInstance.addText(`${order.fullName}\n`);
        await printerInstance.addText(
          `${new Date(order.createdAt).toLocaleString("fr-FR")}\n`,
        );
        await printerInstance.addTextAlign(PrinterConstants.ALIGN_LEFT);
        await printerInstance.addText("--------------------------------\n");

        for (const op of order.orderProducts) {
          await printerInstance.addText(`${op.quantity}x ${op.product.name}\n`);
          for (const opt of op.orderProductOptions) {
            await printerInstance.addText(`  + ${opt.optionChoice.name}\n`);
          }
        }

        await printerInstance.addText("--------------------------------\n");
        await printerInstance.addTextAlign(PrinterConstants.ALIGN_RIGHT);
        await printerInstance.addTextSize(1, 2);
        await printerInstance.addText(
          `TOTAL: ${parseFloat(order.totalPrice).toFixed(2)} EUR\n`,
        );
        await printerInstance.addTextSize(1, 1);
        await printerInstance.addFeedLine(3);
        await printerInstance.addCut();

        await printerInstance.sendData();
        await printerInstance.disconnect();
      });
    } catch (error) {
      console.error("Error printing order", error);
      await printerInstance.disconnect();
      setStatus("error");
    }
  };

  useEffect(() => {
    getData("printer").then(async (printer) => {
      if (printer) {
        setSavedPrinter(printer);
        setStatus("connecting");
        const online = await checkConnection(printer);
        setStatus(online ? "connected" : "error");
      }
    });
  }, []);

  return (
    <PrinterContext.Provider
      value={{
        scan,
        printers: printers || [],
        connect,
        disconnect,
        printTest,
        printOrder,
        isDiscovering,
        status,
        printerError,
        savedPrinter,
      }}
    >
      {children}
    </PrinterContext.Provider>
  );
}

export function usePrinter(): UsePrinterReturn {
  const ctx = useContext(PrinterContext);
  if (!ctx) throw new Error("usePrinter must be used within a PrinterProvider");
  return ctx;
}

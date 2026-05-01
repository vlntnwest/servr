import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  Printer,
  PrinterConstants,
  usePrintersDiscovery,
} from "react-native-esc-pos-printer";
import { PrinterTypes, PrinterStatus, UsePrinterReturn } from "@/types/api";

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

  useEffect(() => {
    getData("printer").then((printer) => {
      if (printer) {
        setSavedPrinter(printer);
        setStatus("connected");
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

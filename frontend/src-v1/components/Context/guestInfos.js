import { createContext, useContext, useState } from "react";

const GuestContext = createContext({});

export function useGuest() {
  return useContext(GuestContext);
}

export default function GuestProvider({ children }) {
  const [guestInfos, setGuestInfos] = useState({
    firstName: "",
    email: "",
    phone: "",
  });

  return (
    <GuestContext.Provider value={{ guestInfos, setGuestInfos }}>
      {children}
    </GuestContext.Provider>
  );
}

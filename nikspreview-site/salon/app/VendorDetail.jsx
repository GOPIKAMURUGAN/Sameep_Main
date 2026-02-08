// "use client";

// import { createContext, useContext, useEffect, useState } from "react";

// const VendorContext = createContext(null);

// export function VendorProvider({ children }) {
//   const [vendorInfo, setVendorInfo] = useState(null);

//   useEffect(() => {
//     async function fetchVendor() {
//       const res = await fetch(
//         `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/vendor/696f5a35564ef79070d7983d`,
//         { cache: "no-store" }
//       );
//       const data = await res.json();
//       setVendorInfo(data);
//     }
//     fetchVendor();
//   }, []);

//   return (
//     <VendorContext.Provider value={{ vendorInfo }}>
//       {children}
//     </VendorContext.Provider>
//   );
// }

// export function useVendor() {
//   return useContext(VendorContext);
// }

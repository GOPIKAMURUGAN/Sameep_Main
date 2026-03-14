// "use client";
// import { createContext, useContext, useState } from "react";
// import Login from "../Login/Login"; // adjust path

// const LoginPopupContext = createContext();

// export function LoginPopupProvider({ children }) {
//   const [open, setOpen] = useState(false);
//   const [afterLogin, setAfterLogin] = useState(null);

//   const openLogin = (callback) => {
//     setAfterLogin(() => callback);
//     setOpen(true);
//   };

//   const closeLogin = () => {
//     setOpen(false);
//     if (afterLogin) {
//       afterLogin();   // 🔁 continue action
//       setAfterLogin(null);
//     }
//   };

//   return (
//     <LoginPopupContext.Provider value={{ openLogin }}>
//       {children}

//       {open && <Login onClose={closeLogin} />}
//     </LoginPopupContext.Provider>
//   );
// }

// export const useLoginPopup = () => useContext(LoginPopupContext);

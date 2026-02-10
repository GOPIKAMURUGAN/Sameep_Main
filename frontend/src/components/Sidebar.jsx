import { NavLink, useNavigate } from "react-router-dom";
import { logout } from "../utils/adminAuth";

function Sidebar() {
  const navigate = useNavigate();

  const linkStyle = ({ isActive }) => ({
    display: "block",
    padding: "10px 15px",
    marginBottom: "10px",
    borderRadius: "5px",
    fontWeight: isActive ? "bold" : "normal",
    color: isActive ? "#00AEEF" : "#333333", // ✅ blue active, gray default
    background: isActive ? "#e6f0ff" : "transparent", // ✅ light blue highlight
    textDecoration: "none",
    transition: "0.2s",
  });

  return (
    <div
      style={{
        width: "220px",
        height: "100vh",
        background: "#ffffff", // ✅ white sidebar
        color: "#333333", // ✅ dark gray text
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        borderRight: "1px solid #ddd", // ✅ subtle border
      }}
    >
      <h2 style={{ color: "#00AEEF", marginBottom: "30px" }}>Sameep</h2>

      <NavLink to="/dashboard" style={linkStyle}>
        📊 Dashboard
      </NavLink>
      <NavLink to="/master" style={linkStyle}>
        📁 Master Data
      </NavLink>
      {/* <NavLink to="/categories" end style={linkStyle}>
        📂 Categories
      </NavLink> */}

      <NavLink to="/dummy-categories" end style={linkStyle}>
        🧪 Categories
      </NavLink>
      <NavLink to="/questions" style={linkStyle}>
        ❓ Questions
      </NavLink>
      {/* <NavLink to="/vendors" style={linkStyle}>
        👥 Vendors
      </NavLink> */}

      <NavLink to="/dummy-vendors" style={linkStyle}>
        🧑‍🔧 Vendor
      </NavLink>
      <NavLink to="/customers" style={linkStyle}>
        👥 Customers
      </NavLink>

      <NavLink to="/app-configurations" style={linkStyle}>
        ⚙️ App Configurations
      </NavLink>
      <NavLink to="/enquiries" style={linkStyle}>
        📩 Enquiries
      </NavLink>

      <div style={{ flex: 1 }} />
      <button
        type="button"
        onClick={() => {
          logout();
          navigate("/login");
        }}
        style={{
          marginTop: "20px",
          padding: "10px 15px",
          borderRadius: "5px",
          border: "1px solid #ddd",
          background: "#ffffff",
          color: "#333333",
          cursor: "pointer",
          width: "100%",
          textAlign: "left",
        }}
      >
        🚪 Logout
      </button>
    </div>
  );
}

export default Sidebar;

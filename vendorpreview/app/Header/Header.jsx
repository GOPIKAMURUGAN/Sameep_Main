"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSessionGuard } from "../Login/useSessionGuard";
import "./Header.css";

import { useVendor } from "../VendorContext";
import Login from "../Login/Login";
import ProfileModal from "../Profile/Profile";
import Portal from "../Portal/Portal";
import CategoryModal from "./CategoryModal";
import PackagesPortal from "../PackagesPortal/PackagesPortal";

const PAGE_SECTIONS = {
  Home: "home",
  Categories: "categories",
  "Why Us": "why-us",
  About: "about",
  Contact: "contact",
};

export default function Header() {
  useSessionGuard();

  const searchParams = useSearchParams();
  const { vendorInfo } = useVendor();

  const rootCategoryId =
    vendorInfo?.categoryId || searchParams.get("rootCategoryId");

  const [categoryData, setCategoryData] = useState(null);
  const [openLogin, setOpenLogin] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const [openServices, setOpenServices] = useState(false);
  const [serviceType, setServiceType] = useState(null);
  const [user, setUser] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // --------------------------------------------------
  // 🔹 Load category for Header (fallback-safe)
  // --------------------------------------------------
  useEffect(() => {
    if (!rootCategoryId) return;
    if (categoryData) return;

    async function loadCategory() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/dummy-categories/${rootCategoryId}`,
          { cache: "no-store" }
        );

        const data = await res.json();
        const categoryObj = Array.isArray(data) ? data[0] : data;
        setCategoryData(categoryObj || null);
      } catch (e) {
        console.error("Header category fetch failed", e);
      }
    }

    loadCategory();
  }, [rootCategoryId, categoryData]);

  // --------------------------------------------------
  // 🔹 User session
  // --------------------------------------------------
  useEffect(() => {
    const updateUser = () => {
      const u = localStorage.getItem("userData");
      setUser(u ? JSON.parse(u) : null);
    };

    updateUser();
    window.addEventListener("storage", updateUser);
    return () => window.removeEventListener("storage", updateUser);
  }, []);

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userData");

    window.dispatchEvent(new Event("storage"));
  };

  // --------------------------------------------------
  // 🔹 Menu helpers
  // --------------------------------------------------
  const webMenu = categoryData?.webMenu || [];

  // --------------------------------------------------
  // 🔹 UI
  // --------------------------------------------------
  const title =
  vendorInfo?.businessName ||
  searchParams.get("vendorName") ||
  "";

  return (
    <>
      <nav className="navbar navbar-expand-lg bg-body-tertiary custom-navbar">
        <div className="container-fluid">
          <a className="navbar-brand fw-bold" href="#home">
            {title}
          </a>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarSupportedContent"
          >
            <span className="navbar-toggler-icon" />
          </button>

          <div className="collapse navbar-collapse" id="navbarSupportedContent">
            <ul className="navbar-nav ms-auto mb-lg-0">
              {/* 🔹 Dynamic menu */}
              {webMenu.map((item) => (
                <li key={item} className="nav-item">
                  <a className="nav-link" href={`#${PAGE_SECTIONS[item]}`}>
                    {item}
                  </a>
                </li>
              ))}

              <li className="nav-item">
                <button
                  className="setup-business-btn"
                  onClick={() => setOpen(true)}
                  type="button"
                >
                  Set up my business
                </button>
              </li>

              {!user && (
                <li className="nav-item">
                  <button
                    className="nav-link login-btn btn-link"
                    onClick={() => setOpenLogin(true)}
                  >
                    Log In
                  </button>
                </li>
              )}

              {user && (
                <li className="nav-item profile-wrapper">
                  <div
                    className="profile-action"
                    onClick={() => setOpenProfile(true)}
                  >
                    <span className="profile-icon">
                      {(user?.name || user?.phone || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                    <span className="profile-text">My Profile</span>
                  </div>

                  <div className="profile-action logout" onClick={logout}>
                    <span className="logout-icon">⏻</span>
                    <span className="profile-text">Logout</span>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </div>
      </nav>

      {openLogin && (
        <Portal>
          <Login onClose={() => setOpenLogin(false)} />
        </Portal>
      )}

      {openProfile && (
        <Portal>
          <ProfileModal
            onClose={() => setOpenProfile(false)}
            onOpenServices={(type) => {
              setProfileLoading(true);
              setServiceType(type);
              setOpenProfile(false);
              setOpenServices(true);
            }}
          />
        </Portal>
      )}

      {openServices && serviceType === "packages" && (
        <Portal>
          <PackagesPortal
            onLoaded={() => setProfileLoading(false)}
            onClose={() => {
              setOpenServices(false);
              setServiceType(null);
              setProfileLoading(false);
            }}
          />
        </Portal>
      )}

      {profileLoading && (
        <div className="profile-loader-overlay">
          <div className="profile-loader-spinner" />
        </div>
      )}

      {open && (
        <Portal>
          <CategoryModal onClose={() => setOpen(false)} />
        </Portal>
      )}
    </>
  );
}

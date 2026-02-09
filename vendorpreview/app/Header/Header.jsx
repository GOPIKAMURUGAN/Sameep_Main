"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

import "./Header.css";

import { useVendor } from "../Vendorcontext";
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

function HeaderLoading() {
  return (
    <nav className="navbar navbar-expand-lg bg-body-tertiary custom-navbar">
      <div className="container-fluid">Loading...</div>
    </nav>
  );
}

function HeaderContent() {
  const searchParams = useSearchParams();
  const rootCategoryId = searchParams.get("rootCategoryId");

  const { vendorInfo, setVendorInfo } = useVendor();

  const [openLogin, setOpenLogin] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const [openServices, setOpenServices] = useState(false);
  const [serviceType, setServiceType] = useState(null);
  const [user, setUser] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!rootCategoryId) return;
    if (vendorInfo?.categoryData) return;

    async function loadCategory() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/dummy-categories/${rootCategoryId}`,
          { cache: "no-store" }
        );

        const data = await res.json();
        const categoryObj = Array.isArray(data) ? data[0] : data;

        setVendorInfo(prev => ({
          ...prev,
          categoryData: categoryObj
        }));
      } catch (e) {
        console.error("Header category fetch failed", e);
      }
    }

    loadCategory();
  }, [rootCategoryId, vendorInfo?.categoryData, setVendorInfo]);

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
    localStorage.removeItem("userData");
    window.dispatchEvent(new Event("storage"));
  };

  const toAnchor = (label) =>
    label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");

  const webMenu = vendorInfo?.categoryData?.webMenu || [];

  return (
    <>
      <nav className="navbar navbar-expand-lg bg-body-tertiary custom-navbar">
        <div className="container-fluid">
          <a className="navbar-brand fw-bold" href="#home">
            {vendorInfo?.businessName}
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
                      {(user?.name || user?.phone || "U").charAt(0).toUpperCase()}
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

export default function Header() {
  return (
    <Suspense fallback={<HeaderLoading />}>
      <HeaderContent />
    </Suspense>
  );
}
"use client"; 
import "./Contact.css";
import { FaPhoneAlt, FaMapMarkerAlt, FaClock } from "react-icons/fa";
import { useVendor } from "../Vendorcontext";

export default function ContactSection() {
  const { vendorInfo } = useVendor();

  if (!vendorInfo) return null;

  const { phone, location, businessHours } = vendorInfo;

  return (
    <section id="contact" className="contact-section">

      <h2 className="contact-title">Ready for Your Transformation?</h2>
      <p className="contact-subtitle">
        Book an appointment, ask a question, or simply say hello.  
        We look forward to welcoming you.
      </p>

      <div className="contact-grid">

        {/* LEFT SIDE */}
        <div className="contact-left">

          {/* CALL US */}
          <div className="contact-card">
            <div className="card-header">
              <FaPhoneAlt className="icon" />
              <h3>Call Us</h3>
            </div>
            <p className="contact-info">
              {phone ? (
                <a href={`tel:${phone}`} className="contact-link">
                  {phone}
                </a>
              ) : (
                "Phone not available"
              )}
            </p>
          </div>

          {/* LOCATION */}
          <div className="contact-card">
            <div className="card-header">
              <FaMapMarkerAlt className="icon" />
              <h3>Our Location</h3>
            </div>

            <p className="contact-info">
              {location?.address || "Location not available"}
            </p>

            {location?.lat && location?.lng && (
              <div className="map-box">
                <iframe
                  title="map"
                  width="100%"
                  height="200"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps?q=${location.lat},${location.lng}&z=15&output=embed`}
                />
              </div>
            )}
          </div>

          {/* BUSINESS HOURS */}
          <div className="contact-card">
            <div className="card-header">
              <FaClock className="icon" />
              <h3>Business Hours</h3>
            </div>

            <ul className="hours-list">
              {Array.isArray(businessHours) && businessHours.length > 0 ? (
                businessHours.map((bh) => (
                  <li key={bh._id}>
                    <span>{bh.day}</span>
                    <span className="open">{bh.hours || "Closed"}</span>
                  </li>
                ))
              ) : (
                <li>Business hours not available</li>
              )}
            </ul>
          </div>

        </div>

        {/* RIGHT SIDE */}
        <div className="contact-right">
          <div className="contact-form-card">
            <input type="text" placeholder="Your Name" />
            <input type="text" placeholder="Phone Number" />
            <textarea placeholder="Your Message (Optional)" />

            <button className="send-btn">
              Send Message <span>✈</span>
            </button>
          </div>
        </div>

      </div>

    </section>
  );
}

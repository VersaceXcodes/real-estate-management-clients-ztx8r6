import React from "react";
import { Link } from "react-router-dom";

const GV_Footer: React.FC = () => {
  // Define footer links as per the datamap (consider integrating with global state if dynamic updating is needed).
  const footerLinks: { label: string; url: string }[] = [
    { label: "Support", url: "/support" },
    { label: "Contact", url: "/contact" },
    { label: "Privacy Policy", url: "/privacy-policy" }
  ];

  // Compute the current year for copyright information.
  const currentYear: number = new Date().getFullYear();

  // Render the footer with a single return block.
  return (
    <>
      <footer className="bg-gray-100 text-gray-600 text-sm w-full">
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between">
          <div className="mb-2 md:mb-0">
            <span>&copy; {currentYear} EstateConnect. All rights reserved.</span>
          </div>
          <div className="flex space-x-4">
            {footerLinks.map((link, index) => {
              // Determine whether the link is external by checking if it starts with "http"
              const isExternal = link.url.startsWith("http");
              return (
                <React.Fragment key={index}>
                  {isExternal ? (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link to={link.url} className="hover:underline">
                      {link.label}
                    </Link>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </footer>
    </>
  );
};

export default GV_Footer;
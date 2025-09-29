"use client";

import React from "react";
import {
  LogOut,
  Settings,
  Monitor,
  Sun,
  Moon,
  User,
  CreditCard,
  Smile,
  HelpCircle,
  ChevronRight,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface SettingsPopoverProps {
  onLogout: () => void;
  collapsed?: boolean;
  user?: {
    name: string;
    email: string;
    plan?: string;
    avatar_url?: string;
  };
}

export function SettingsPopover({
  onLogout,
  collapsed = false,
  user,
}: SettingsPopoverProps) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setImageError(false);
  }, [user?.avatar_url]);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    setOpen(false);
  };

  const handleLogout = () => {
    onLogout();
    setOpen(false);
    router.push("/");
  };

  const getCurrentThemeIcon = () => {
    switch (theme) {
      case "light":
        return Sun;
      case "dark":
        return Moon;
      default:
        return Monitor;
    }
  };

  return (
    <div
      className={`relative w-full justify-center items-center flex ${collapsed ? "my-2" : "my-0"
        }`}
      ref={dropdownRef}
    >
      {collapsed ? (
        <button
          onClick={() => setOpen(!open)}
          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-medium hover:bg-blue-600 transition-colors overflow-hidden"
          title={user?.name || "User"}
        >
          {user?.avatar_url && !imageError ? (
            <img
              src={user.avatar_url}
              alt={user?.name || "User"}
              className="w-6 h-6 rounded-full object-cover"
              onError={() => {
                setImageError(true);
              }}
            />
          ) : (
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
          )}
        </button>
      ) : (
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-3 p-0 rounded-lg hover:bg-accent transition-colors text-left"
          title="Open settings"
        >
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-medium overflow-hidden ml-2">
            {user?.avatar_url && !imageError ? (
              <img
                src={user.avatar_url}
                alt={user?.name || "User"}
                className="w-6 h-6 rounded-full object-cover"
                onError={() => {
                  setImageError(true);
                }}
              />
            ) : (
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
            )}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm text-foreground truncate">
              {user?.name || "User"}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {user?.plan || "Free"}
            </span>
          </div>
        </button>
      )}

      {open && (
        <div
          className={`
            absolute bg-popover border border-border rounded-lg shadow-lg
            ${collapsed
              ? "left-full ml-2 bottom-0 w-64"
              : "bottom-full mb-4 w-full right-0"
            }
          `}
          style={{ zIndex: 9999 }}
        >
          {/* User Info Section */}
          <div className="p-2 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium overflow-hidden">
                {user?.avatar_url && !imageError ? (
                  <img
                    src={user.avatar_url}
                    alt={user?.name || "User"}
                    className="w-8 h-8 rounded-full object-cover"
                    onError={() => {
                      setImageError(true);
                    }}
                  />
                ) : (
                  <div className="w-8 h-8 text-sm h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                )}
              </div>
              <div>
                <div className="font-medium text-sm text-popover-foreground">
                  {user?.name || "User"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {user?.email || "user@example.com"}
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-2">
            {/* Upgrade Plan */}
            <button className="w-full flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-accent text-left">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-popover-foreground">
                Upgrade plan
              </span>
            </button>

            {/* Personalization */}
            <button className="w-full flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-accent text-left">
              <Smile className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-popover-foreground">
                Personalization
              </span>
            </button>

            {/* Theme Selector */}
            <div className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-accent">
              <div className="flex items-center space-x-3">
                {React.createElement(getCurrentThemeIcon(), {
                  className: "h-4 w-4 text-muted-foreground",
                })}
                <span className="text-sm text-popover-foreground">Theme</span>
              </div>
              <div className="flex space-x-1">
                {[
                  { value: "system", icon: Monitor, label: "System" },
                  { value: "light", icon: Sun, label: "Light" },
                  { value: "dark", icon: Moon, label: "Dark" },
                ].map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleThemeChange(option.value)}
                      className={`p-1.5 rounded ${theme === option.value
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                        }`}
                      title={option.label}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Settings */}
            <button className="w-full flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-accent text-left">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-popover-foreground">Settings</span>
            </button>

            <div className="my-2 border-t border-border"></div>

            {/* Help */}
            <button className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-accent text-left">
              <div className="flex items-center space-x-3">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-popover-foreground">Help</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            {/* Log out */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-accent text-left"
            >
              <LogOut className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-popover-foreground">Log out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

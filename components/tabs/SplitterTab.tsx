import React, { useState, useEffect, useRef } from "react";
import { Trash2, Copy, Check, TableProperties, ExternalLink, Settings, Plus, X, RefreshCw, Shuffle, Database, AlertCircle, Sparkles, RotateCcw } from "lucide-react";
import { generateTOTP } from "@/utils/totp";
import { useAuth } from "@/context/AuthContext";

interface SplitterTabProps {
  splitterInput: string;
  setSplitterInput: (val: string) => void;
  copiedId: string | null;
  handleCopy: (text: string, id: string, isHtml?: boolean) => void;
  activeAuthor: string;
  activeTabId: string;
  tabs: any[];
  setTabs: React.Dispatch<React.SetStateAction<any[]>>;
  setAuthor: (val: string) => void;
}

export interface FieldConfig {
  label: string;
  colIndex: number;
  splitChar?: string;
}

export interface SheetFormat {
  id: string;
  name: string;
  fields: FieldConfig[];
}

const DEFAULT_FIELDS: FieldConfig[] = [
  { label: "STT", colIndex: 0 },
  { label: "Mail", colIndex: 1, splitChar: "|" },
  { label: "PASS", colIndex: 2 },
  { label: "2FA", colIndex: 3 },
  { label: "Very Bank", colIndex: 4 },
  { label: "MAIL KP", colIndex: 5 },
  { label: "PHONE", colIndex: 6, splitChar: "|" },
  { label: "RN", colIndex: 7 },
  { label: "AN", colIndex: 8 },
  { label: "NAME", colIndex: 9 },
  { label: "ADRESS", colIndex: 10, splitChar: "," },
  { label: "SSN", colIndex: 11 },
  { label: "PACK", colIndex: 12 },
  { label: "LINK BOOK", colIndex: 13 },
  { label: "PICE", colIndex: 15 },
  { label: "TAX", colIndex: 16 }
];

const US_STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "District of Columbia", PR: "Puerto Rico"
};

function processAddressItems(items: string[]): string[] {
  const result: string[] = [];
  const stateZipRegex = /^([a-zA-Z]{2})\s+(\d+(?:\s*-\s*\d+)?)$/;
  const zipPlus4Regex = /^(\d+)\s*-\s*(\d+)$/;

  for (const item of items) {
    const trimmed = item.trim();
    const match = trimmed.match(stateZipRegex);
    if (match) {
      const stateAbbr = match[1].toUpperCase();
      const zipCode = match[2];
      const stateName = US_STATES[stateAbbr] || match[1];
      result.push(stateName);
      
      const zipMatch = zipCode.match(zipPlus4Regex);
      if (zipMatch) {
        result.push(zipMatch[1]);
        result.push(zipMatch[2]);
      } else {
        result.push(zipCode);
      }
    } else {
      const zipMatch = trimmed.match(zipPlus4Regex);
      if (zipMatch) {
        result.push(zipMatch[1]);
        result.push(zipMatch[2]);
      } else {
        result.push(trimmed);
      }
    }
  }
  return result;
}

// Helpers for proper casing and SSN parsing
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

interface SplitItem {
  label?: string;
  value: string;
}

function parseSsnField(rawValue: string): SplitItem[] {
  const parts = rawValue.split(";").map(p => p.trim());
  if (parts.length === 10) {
    const name = toTitleCase(parts[0]);
    const street = toTitleCase(parts[1]);
    const city = toTitleCase(parts[2]);
    const state = parts[3].toUpperCase();
    const zip = parts[4];
    const country = parts[5].toUpperCase();
    const address = `${street}, ${city}, ${state} ${zip}, ${country}`;
    
    const ssnVal = parts[6];
    const dob = parts[7];
    const phone = parts[8];
    const email = parts[9].toLowerCase();
    
    return [
      { label: "Họ tên", value: name },
      { label: "Địa chỉ", value: address },
      { label: "SSN", value: ssnVal },
      { label: "Ngày sinh", value: dob },
      { label: "Số điện thoại", value: phone },
      { label: "Email", value: email }
    ];
  } else if (parts.length === 9) {
    const name = toTitleCase(parts[0]);
    const street = toTitleCase(parts[1]);
    const city = toTitleCase(parts[2]);
    const state = parts[3].toUpperCase();
    const zip = parts[4];
    const address = `${street}, ${city}, ${state} ${zip}`;
    
    const ssnVal = parts[5];
    const dob = parts[6];
    const phone = parts[7];
    const email = parts[8].toLowerCase();
    
    return [
      { label: "Họ tên", value: name },
      { label: "Địa chỉ", value: address },
      { label: "SSN", value: ssnVal },
      { label: "Ngày sinh", value: dob },
      { label: "Số điện thoại", value: phone },
      { label: "Email", value: email }
    ];
  } else {
    return parts.map((part, index) => ({
      label: `Mục ${index + 1}`,
      value: part
    }));
  }
}

function parseHeaderRow(headerText: string): FieldConfig[] {
  const cols = headerText.split("\t");
  const newFields: FieldConfig[] = [];
  cols.forEach((col, idx) => {
    const trimmed = col.trim();
    if (trimmed) {
      let splitChar: string | undefined = undefined;
      const upperLabel = trimmed.toUpperCase();
      if (upperLabel.includes("MAIL") || upperLabel.includes("GMAIL") || upperLabel.includes("EMAIL")) {
        splitChar = "|";
      } else if (upperLabel.includes("PHONE") || upperLabel.includes("SĐT")) {
        splitChar = "|";
      } else if (upperLabel.includes("ADRESS") || upperLabel.includes("ADDRESS") || upperLabel.includes("ĐỊA CHỈ")) {
        splitChar = ",";
      }
      
      newFields.push({
        label: trimmed,
        colIndex: idx,
        splitChar
      });
    }
  });
  return newFields;
}

interface TotpDisplayProps {
  secret: string;
  copiedId: string | null;
  handleCopy: (text: string, id: string) => void;
}

const TotpDisplay: React.FC<TotpDisplayProps> = ({
  secret,
  copiedId,
  handleCopy
}) => {
  const [code, setCode] = useState<string>("------");
  const [timeLeft, setTimeLeft] = useState<number>(30);

  useEffect(() => {
    if (!secret || secret.trim().length < 8) {
      setCode("Mã lỗi / Ngắn");
      return;
    }

    let active = true;

    const updateTotp = async () => {
      const res = await generateTOTP(secret);
      if (active) {
        setCode(res.code);
        setTimeLeft(res.timeLeft);
      }
    };

    updateTotp();
    const interval = setInterval(updateTotp, 1000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [secret]);

  const progressPercent = (timeLeft / 30) * 100;

  return (
    <div className="space-y-2 mt-2 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/50">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-indigo-400 dark:text-indigo-300 uppercase tracking-wider">
          Mã 2FA Live
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-semibold">{timeLeft}s</span>
          <div className="w-8 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${
                timeLeft < 6 ? "bg-red-500 animate-pulse" : "bg-indigo-600 dark:bg-indigo-500"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <button
        onClick={() => handleCopy(code, `totp-${secret}`)}
        className="w-full flex items-center justify-between bg-white dark:bg-[#1f2937] hover:bg-indigo-100 dark:hover:bg-indigo-900/50 active:bg-indigo-200 dark:active:bg-indigo-900 border border-indigo-200 dark:border-indigo-850 hover:border-indigo-400 dark:hover:border-indigo-700 rounded-lg px-3 py-2 transition-all cursor-pointer text-left group"
        title="Click để copy mã 2FA"
      >
        <span className="text-xl font-mono font-bold tracking-widest text-indigo-700 dark:text-indigo-300">
          {code}
        </span>
        <span className="shrink-0 text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
          {copiedId === `totp-${secret}` ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <Copy className="w-4 h-4 opacity-50 group-hover:opacity-100" />
          )}
        </span>
      </button>
    </div>
  );
};

export const SplitterTab: React.FC<SplitterTabProps> = ({
  splitterInput,
  setSplitterInput,
  copiedId,
  handleCopy,
  activeAuthor,
  activeTabId,
  tabs,
  setTabs,
  setAuthor
}) => {
  const { user } = useAuth();

  // Apps Script Integration States
  const [appsScriptUrl, setAppsScriptUrl] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("bofo_apps_script_url") || "";
    }
    return "";
  });

  const [availableCards, setAvailableCards] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("bofo_available_cards");
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return [];
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [processingCards, setProcessingCards] = useState<Record<string, boolean>>({});
  const [manualEmail, setManualEmail] = useState("");
  const [duplicateCards, setDuplicateCards] = useState<Record<string, boolean>>({});

  const isAnyCardProcessing = isSyncing || Object.values(processingCards).some(Boolean);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem("bofo_apps_script_url", appsScriptUrl);
  }, [appsScriptUrl]);

  useEffect(() => {
    localStorage.setItem("bofo_available_cards", JSON.stringify(availableCards));
  }, [availableCards]);





  // Extract active tab's cards
  const activeTabObj = tabs.find(t => t.id === activeTabId);
  const tabAssignedCards = activeTabObj?.assignedCards || [];
  const tabCompletedCards = activeTabObj?.completedCards || [];

  // Format states
  const [sheetFormats, setSheetFormats] = useState<SheetFormat[]>([]);
  const [selectedFormatId, setSelectedFormatId] = useState<string>("default");

  // Config Modal states
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [selectedEditFormatId, setSelectedEditFormatId] = useState<string>("new");
  const [editFormatName, setEditFormatName] = useState<string>("");
  const [editFields, setEditFields] = useState<FieldConfig[]>([]);

  // Load sheet formats from LocalStorage or API
  const fetchFormats = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("boofor_session_id") : null;
    const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

    if (isLocal || !token) {
      // Local development fallback
      const savedFormats = localStorage.getItem("bofo_sheet_formats");
      const savedSelectedId = localStorage.getItem("bofo_selected_sheet_format_id");
      if (savedFormats) {
        try {
          setSheetFormats(JSON.parse(savedFormats));
        } catch (e) {
          console.error(e);
        }
      }
      if (savedSelectedId) {
        setSelectedFormatId(savedSelectedId);
      }
      return;
    }

    try {
      const res = await fetch("/api/auth/sheet-formats", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setSheetFormats(data.sheetFormats || []);
        setSelectedFormatId(data.selectedSheetFormatId || "default");
      }
    } catch (error) {
      console.error("Failed to fetch sheet formats:", error);
    }
  };

  useEffect(() => {
    fetchFormats();
  }, [user]);

  // Save selected format and list
  const saveFormatsAndSelection = async (newFormats: SheetFormat[], newSelectedId: string) => {
    setSheetFormats(newFormats);
    setSelectedFormatId(newSelectedId);

    localStorage.setItem("bofo_sheet_formats", JSON.stringify(newFormats));
    localStorage.setItem("bofo_selected_sheet_format_id", newSelectedId);

    const token = typeof window !== "undefined" ? localStorage.getItem("boofor_session_id") : null;
    const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

    if (!isLocal && token) {
      try {
        await fetch("/api/auth/sheet-formats", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            sheetFormats: newFormats,
            selectedSheetFormatId: newSelectedId
          })
        });
      } catch (error) {
        console.error("Failed to save sheet formats to database:", error);
      }
    }
  };

  const handleSaveEditFormat = () => {
    if (!editFormatName.trim()) {
      alert("Vui lòng nhập tên format.");
      return;
    }
    if (editFields.length === 0) {
      alert("Format cần có ít nhất một cột.");
      return;
    }

    // Sort fields by index for cleaner configuration
    const sortedFields = [...editFields].sort((a, b) => a.colIndex - b.colIndex);

    let updatedFormats = [...sheetFormats];
    let newSelectedId = selectedFormatId;

    if (selectedEditFormatId === "new") {
      const newFormat: SheetFormat = {
        id: `format_${Date.now()}`,
        name: editFormatName.trim(),
        fields: sortedFields.map(f => ({ ...f, label: f.label.trim() }))
      };
      updatedFormats.push(newFormat);
      newSelectedId = newFormat.id;
    } else {
      updatedFormats = updatedFormats.map(f => {
        if (f.id === selectedEditFormatId) {
          return {
            ...f,
            name: editFormatName.trim(),
            fields: sortedFields.map(field => ({ ...field, label: field.label.trim() }))
          };
        }
        return f;
      });
      newSelectedId = selectedEditFormatId;
    }

    saveFormatsAndSelection(updatedFormats, newSelectedId);
    setIsConfigOpen(false);
  };

  const handleDeleteFormat = (formatId: string) => {
    if (formatId === "default") return;
    if (!confirm("Bạn có chắc chắn muốn xóa format này không?")) return;

    const updatedFormats = sheetFormats.filter(f => f.id !== formatId);
    const newSelectedId = selectedFormatId === formatId ? "default" : selectedFormatId;

    saveFormatsAndSelection(updatedFormats, newSelectedId);
    
    // Reset edit state
    setSelectedEditFormatId("new");
    setEditFormatName("Format Mới");
    setEditFields([{ label: "STT", colIndex: 0 }]);
  };

  // Get active format
  const activeFormat = selectedFormatId === "default" 
    ? { id: "default", name: "Mặc định hệ thống", fields: DEFAULT_FIELDS }
    : sheetFormats.find(f => f.id === selectedFormatId) || { id: "default", name: "Mặc định hệ thống", fields: DEFAULT_FIELDS };

  // Parse input
  const rows = splitterInput.split("\n").map(r => r.trim()).filter(r => r);
  const activeRow = rows[0] || "";
  const columns = activeRow ? activeRow.split("\t").map(col => col.trim()) : [];

  // Automatically sync author name from splitterInput using active format fields config
  useEffect(() => {
    if (splitterInput && setAuthor) {
      const rowsList = splitterInput.split("\n").map(r => r.trim()).filter(r => r);
      const firstRow = rowsList[0] || "";
      const cols = firstRow ? firstRow.split("\t").map(col => col.trim()) : [];
      
      const fields = activeFormat.fields;
      const nameField = fields.find((f: any) => f.label.toUpperCase() === "NAME") 
        || fields.find((f: any) => {
             const lbl = f.label.toUpperCase();
             return lbl === "HỌ TÊN" || lbl === "TÊN" || lbl === "NAME ADD";
           })
        || fields.find((f: any) => f.label.toUpperCase().includes("NAME"));
        
      if (nameField && cols[nameField.colIndex]) {
        const val = cols[nameField.colIndex].trim();
        if (val && val !== activeAuthor) {
          setAuthor(val);
        }
      }
    }
  }, [splitterInput, selectedFormatId, sheetFormats, setAuthor, activeAuthor, activeFormat]);

  const visibleConfigs = activeFormat.fields.filter(config => {
    const rawValue = columns[config.colIndex] || "";
    return rawValue.trim() !== "";
  });

  // Target Email and card methods
  const detectTargetEmail = () => {
    if (splitterInput) {
      const rows = splitterInput.split("\n").map(r => r.trim()).filter(r => r);
      const activeRow = rows[0] || "";
      const cols = activeRow.split("\t").map(col => col.trim());
      
      const emailField = activeFormat.fields.find(f => {
        const lbl = f.label.toUpperCase();
        return lbl.includes("MAIL") || lbl.includes("GMAIL") || lbl.includes("EMAIL");
      });
      
      if (emailField && cols[emailField.colIndex]) {
        const rawEmail = cols[emailField.colIndex];
        const parts = rawEmail.split("|").map(p => p.trim());
        const email = parts.find(p => p.includes("@"));
        if (email) return email;
      }
      
      for (const col of cols) {
        if (col.includes("@")) {
          const parts = col.split("|").map(p => p.trim());
          const email = parts.find(p => p.includes("@"));
          if (email) return email;
        }
      }
    }
    
    if (activeAuthor && activeAuthor.includes("@")) {
      return activeAuthor.trim();
    }
    
    return "";
  };

  const detectedEmail = detectTargetEmail();
  const targetEmail = manualEmail || detectedEmail;



  // Update tab cards helper
  const updateTabCards = (assigned: string[], completed: string[]) => {
    setTabs((prev: any[]) => prev.map((t: any) => {
      if (t.id === activeTabId) {
        return {
          ...t,
          assignedCards: assigned,
          completedCards: completed
        };
      }
      return t;
    }));
  };

  const initialSyncRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (!appsScriptUrl || !targetEmail || !activeTabId) return;

    const syncKey = `${activeTabId}-${targetEmail}`;
    if (initialSyncRef.current[syncKey]) return;
    initialSyncRef.current[syncKey] = true;

    const autoSync = async () => {
      try {
        const syncUrl = `${appsScriptUrl}?action=cleanup`;
        const res = await fetch(syncUrl, {
          method: "GET",
          mode: "cors"
        });
        const data = await res.json();
        
        if (data && data.success) {
          const cardsList = data.cards || [];
          setAvailableCards(cardsList);
          
          const matchingSheetCards = cardsList
            .filter((c: any) => c.mailGan && c.mailGan.toLowerCase().trim() === targetEmail.toLowerCase().trim())
            .map((c: any) => c.cardValue);
            
          updateTabCards(matchingSheetCards, tabCompletedCards);
        }
      } catch (error) {
        console.error("Auto-sync error on load:", error);
      }
    };

    autoSync();
  }, [appsScriptUrl, targetEmail, activeTabId]);

  // Sync cards with Sheets Apps Script Web App
  const handleSyncCards = async () => {
    if (!appsScriptUrl) {
      alert("Vui lòng cấu hình URL Google Apps Script Web App trước!");
      return;
    }
    
    setIsSyncing(true);
    try {
      const syncUrl = `${appsScriptUrl}?action=cleanup`;
      const res = await fetch(syncUrl, {
        method: "GET",
        mode: "cors"
      });
      const data = await res.json();
      
      if (data && data.success) {
        const cardsList = data.cards || [];
        setAvailableCards(cardsList);
        
        if (targetEmail) {
          const matchingSheetCards = cardsList
            .filter((c: any) => c.mailGan && c.mailGan.toLowerCase().trim() === targetEmail.toLowerCase().trim())
            .map((c: any) => c.cardValue);
            
          updateTabCards(matchingSheetCards, tabCompletedCards);
        }
        
        alert(`Đồng bộ thành công! Đã tải về và cập nhật lại danh sách thẻ từ Sheets.`);
      } else {
        alert(`Lỗi đồng bộ: ${data.error || "Không rõ nguyên nhân"}`);
      }
    } catch (error) {
      console.error("Sync error:", error);
      alert("Lỗi kết nối đến Google Sheets Apps Script. Vui lòng kiểm tra xem URL đã đúng chưa và Web App đã được triển khai cấu hình quyền truy cập (Anyone) hay chưa.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Assign 5 random cards to active author from Google Sheets (server-side lock)
  const handleAssignCards = async () => {
    if (!appsScriptUrl) {
      alert("Vui lòng cấu hình URL Google Apps Script Web App trước!");
      return;
    }
    if (!targetEmail) {
      alert("Không phát hiện được Email. Vui lòng dán hàng dữ liệu có chứa mail hoặc nhập thủ công Email trước khi bốc thẻ!");
      return;
    }
    
    setIsSyncing(true);
    try {
      const assignUrl = `${appsScriptUrl}?action=assignCards&mail=${encodeURIComponent(targetEmail)}&count=5`;
      const res = await fetch(assignUrl, {
        method: "GET",
        mode: "cors"
      });
      const data = await res.json();
      
      if (data && data.success) {
        const picked = data.cards || [];
        if (picked.length === 0) {
          alert("Không còn thẻ trống nào trong tab Thẻ để gán!");
        } else {
          updateTabCards([...tabAssignedCards, ...picked], tabCompletedCards);
          
          // Refresh the local available cards pool
          const refreshRes = await fetch(`${appsScriptUrl}?action=getCards`, { method: "GET", mode: "cors" });
          const refreshData = await refreshRes.json();
          if (refreshData && refreshData.success) {
            setAvailableCards(refreshData.cards || []);
          }
        }
      } else {
        alert(`Lỗi gán thẻ: ${data.error || "Không rõ nguyên nhân"}`);
      }
    } catch (error) {
      console.error("Assign cards error:", error);
      alert("Lỗi kết nối đến Google Sheets Apps Script khi gán thẻ. Vui lòng kiểm tra lại URL.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleCard = async (card: string) => {
    if (tabCompletedCards.includes(card)) return;
    
    if (!appsScriptUrl) {
      alert("Vui lòng cấu hình URL Google Apps Script Web App trước!");
      return;
    }
    
    if (!targetEmail) {
      alert("Không phát hiện được Email. Vui lòng dán hàng dữ liệu có chứa mail hoặc nhập thủ công Email bên dưới trước khi tích chọn thẻ!");
      return;
    }
    
    setProcessingCards(prev => ({ ...prev, [card]: true }));
    
    try {
      const targetUrl = `${appsScriptUrl}?action=moveCard&card=${encodeURIComponent(card)}&mail=${encodeURIComponent(targetEmail)}`;
      const res = await fetch(targetUrl, {
        method: "GET",
        mode: "cors"
      });
      
      const data = await res.json();
      if (data && data.success) {
        const nextCompleted = [...tabCompletedCards, card];
        const nextAssigned = tabAssignedCards.filter((c: string) => c !== card);
        updateTabCards(nextAssigned, nextCompleted);
        setDuplicateCards(prev => {
          const next = { ...prev };
          delete next[card];
          return next;
        });
      } else {
        if (data && data.error === "DUPLICATE") {
          setDuplicateCards(prev => ({ ...prev, [card]: true }));
          alert(`CẢNH BÁO TRÙNG THẺ:\n${data.message || "Thẻ này đã tồn tại trong tab MAIL BẤM!"}`);
        } else {
          alert(`Lỗi di chuyển thẻ: ${data.error || "Không rõ nguyên nhân"}`);
        }
      }
    } catch (error) {
      console.error("Move card error:", error);
      alert("Lỗi kết nối đến Google Sheets Apps Script. Vui lòng kiểm tra lại URL hoặc kết nối mạng.");
    } finally {
      setProcessingCards(prev => ({ ...prev, [card]: false }));
    }
  };

  const parseCardString = (cardStr: string) => {
    const parts = cardStr.split("|").map(p => p.trim());
    const cardNumber = parts[0] || "";
    const mm = parts[1] || "";
    const yy = parts[2] || "";
    const cvv = parts[3] || "";
    const details = parts.slice(4).join(" | ") || "";
    
    let expiry = "";
    if (mm && yy) {
      expiry = `${mm}/${yy}`;
    } else if (mm) {
      expiry = mm;
    }
    
    return {
      cardNumber,
      expiry,
      cvv,
      details
    };
  };

  const handleMarkErrorCard = async (card: string) => {
    if (!appsScriptUrl) {
      alert("Vui lòng cấu hình URL Google Apps Script Web App trước!");
      return;
    }
    
    if (!confirm("Đánh dấu thẻ này bị lỗi? Thẻ sẽ được giữ lại trên Google Sheets nhưng tô màu vàng và giải phóng email gán.")) {
      return;
    }

    setProcessingCards(prev => ({ ...prev, [card]: true }));
    
    try {
      const targetUrl = `${appsScriptUrl}?action=markErrorCard&card=${encodeURIComponent(card)}`;
      const res = await fetch(targetUrl, {
        method: "GET",
        mode: "cors"
      });
      
      const data = await res.json();
      if (data && data.success) {
        const nextAssigned = tabAssignedCards.filter((c: string) => c !== card);
        updateTabCards(nextAssigned, tabCompletedCards);
        
        // Refresh available cards pool
        const refreshRes = await fetch(`${appsScriptUrl}?action=getCards`, { method: "GET", mode: "cors" });
        const refreshData = await refreshRes.json();
        if (refreshData && refreshData.success) {
          setAvailableCards(refreshData.cards || []);
        }
      } else {
        alert(`Lỗi đánh dấu thẻ lỗi: ${data.error || "Không rõ nguyên nhân"}`);
      }
    } catch (error) {
      console.error("Mark error card error:", error);
      alert("Lỗi kết nối đến Google Sheets Apps Script. Vui lòng kiểm tra lại URL hoặc kết nối mạng.");
    } finally {
      setProcessingCards(prev => ({ ...prev, [card]: false }));
    }
  };

  const handleReleaseSingleCard = async (card: string) => {
    if (!appsScriptUrl) {
      alert("Vui lòng cấu hình URL Google Apps Script Web App trước!");
      return;
    }
    if (!targetEmail) {
      alert("Thiếu Email mục tiêu để giải phóng thẻ!");
      return;
    }
    


    setProcessingCards(prev => ({ ...prev, [card]: true }));
    
    try {
      const releaseUrl = `${appsScriptUrl}?action=releaseCards&mail=${encodeURIComponent(targetEmail)}&cards=${encodeURIComponent(card)}`;
      const res = await fetch(releaseUrl, {
        method: "GET",
        mode: "cors"
      });
      const data = await res.json();
      
      if (data && data.success) {
        // Remove from assignedCards in UI
        const nextAssigned = tabAssignedCards.filter((c: string) => c !== card);
        updateTabCards(nextAssigned, tabCompletedCards);
        
        // Refresh available cards pool
        const refreshRes = await fetch(`${appsScriptUrl}?action=getCards`, { method: "GET", mode: "cors" });
        const refreshData = await refreshRes.json();
        if (refreshData && refreshData.success) {
          setAvailableCards(refreshData.cards || []);
        }
      } else {
        alert(`Lỗi giải phóng thẻ: ${data.error || "Không rõ nguyên nhân"}`);
      }
    } catch (error) {
      console.error("Release single card error:", error);
      alert("Lỗi kết nối đến Google Sheets Apps Script. Vui lòng kiểm tra lại URL hoặc kết nối mạng.");
    } finally {
      setProcessingCards(prev => ({ ...prev, [card]: false }));
    }
  };

  const handleResetCards = async () => {
    if (!confirm("Bạn có chắc chắn muốn xóa tất cả thẻ đang gán và hoàn thành của tác giả này khỏi giao diện boofor và giải phóng thẻ trên Google Sheets không?")) {
      return;
    }

    if (appsScriptUrl && targetEmail && tabAssignedCards.length > 0) {
      setIsSyncing(true);
      try {
        const cardsToRelease = tabAssignedCards.join("###");
        const releaseUrl = `${appsScriptUrl}?action=releaseCards&mail=${encodeURIComponent(targetEmail)}&cards=${encodeURIComponent(cardsToRelease)}`;
        await fetch(releaseUrl, {
          method: "GET",
          mode: "cors"
        });
        
        // Refresh the local available cards pool
        const refreshRes = await fetch(`${appsScriptUrl}?action=getCards`, { method: "GET", mode: "cors" });
        const refreshData = await refreshRes.json();
        if (refreshData && refreshData.success) {
          setAvailableCards(refreshData.cards || []);
        }
      } catch (error) {
        console.error("Release cards error:", error);
      } finally {
        setIsSyncing(false);
      }
    }
    
    updateTabCards([], []);
  };

  return (
    <div className="space-y-6">
      {/* Top Input & Control Section */}
      <div className="bg-white dark:bg-[#161b22] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-100 flex items-center gap-2">
              <TableProperties className="w-5 h-5 text-indigo-600 dark:text-indigo-450" />
              Sheet Column Splitter
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Dán một hàng dữ liệu từ Google Sheets/Excel (ngăn cách bằng phím Tab), hệ thống sẽ tự phân tách các cột và mục nhỏ.
            </p>
          </div>
          {splitterInput && (
            <button
              onClick={() => setSplitterInput("")}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-red-200 dark:border-red-900/50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Reset / Clear
            </button>
          )}
        </div>

        {/* Format Selector Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-gray-50 dark:bg-[#0d1117]/50 p-3 rounded-xl border border-gray-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-slate-300 uppercase tracking-wider">
            Format Sheet:
          </div>
          <div className="flex-1 flex gap-2">
            <select
              value={selectedFormatId}
              onChange={(e) => saveFormatsAndSelection(sheetFormats, e.target.value)}
              className="flex-1 text-sm bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-[#30363d] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 dark:text-slate-200 cursor-pointer shadow-sm"
            >
              <option value="default">Mặc định hệ thống</option>
              {sheetFormats.map((format) => (
                <option key={format.id} value={format.id}>
                  {format.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setSelectedEditFormatId(selectedFormatId === "default" ? "new" : selectedFormatId);
                if (selectedFormatId === "default") {
                  setEditFormatName("Format Mới");
                  setEditFields([{ label: "STT", colIndex: 0 }]);
                } else {
                  const current = sheetFormats.find(f => f.id === selectedFormatId);
                  if (current) {
                    setEditFormatName(current.name);
                    setEditFields([...current.fields]);
                  }
                }
                setIsConfigOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[#161b22] hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 text-xs font-semibold rounded-lg border border-gray-300 dark:border-slate-700 transition-colors cursor-pointer shadow-sm"
            >
              <Settings className="w-3.5 h-3.5 text-gray-500" />
              Cấu hình Format
            </button>
          </div>
        </div>

        <textarea
          rows={3}
          value={splitterInput}
          onChange={(e) => setSplitterInput(e.target.value)}
          placeholder="Dán hàng dữ liệu từ Sheet tại đây (Ví dụ: 103  muhammaduy95@gmail.com|DungGameRefundSTT176...)"
          className="w-full p-3 bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900 dark:text-slate-200 font-mono shadow-inner"
        />
      </div>

      {/* Google Sheets Card Integration Panel */}
      <div className="bg-white dark:bg-[#161b22] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-gray-100 dark:border-slate-800">
          <div>
            <h3 className="text-md font-semibold text-gray-800 dark:text-slate-100 flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Kết nối Google Sheets & Quản lý Thẻ
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Đồng bộ thẻ từ tab "Thẻ", rà soát trùng lặp và tự động chuyển thẻ vào tab "MAIL BẤM" qua Apps Script.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <input
              type="text"
              value={appsScriptUrl}
              onChange={(e) => setAppsScriptUrl(e.target.value)}
              placeholder="Nhập Google Apps Script Web App URL..."
              className="flex-1 lg:w-80 text-xs bg-gray-50 dark:bg-[#0d1117] border border-gray-250 dark:border-[#30363d] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-850 dark:text-slate-200 shadow-inner"
            />
            <button
              onClick={handleSyncCards}
              disabled={isAnyCardProcessing || !appsScriptUrl}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 dark:disabled:bg-slate-850 text-white disabled:text-gray-405 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Đang đồng bộ..." : "Đồng bộ & Rà soát Thẻ"}
            </button>
          </div>
        </div>

        {/* Setup and Assignment Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left panel: Info status & Pool status */}
          <div className="lg:col-span-4 space-y-4 bg-gray-50/50 dark:bg-[#0d1117]/30 p-4 rounded-xl border border-gray-150 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-500 dark:text-slate-400">Pool Thẻ khả dụng:</span>
              <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 font-extrabold rounded-full">
                {availableCards.filter((c: any) => !c.mailGan).length} thẻ
              </span>
            </div>

            <div className="space-y-2 text-xs border-t border-gray-200/50 dark:border-slate-800/50 pt-3">
              <div className="font-semibold text-gray-600 dark:text-slate-300">Tác giả đang làm:</div>
              <div className="px-3 py-2 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-slate-850 rounded-lg font-mono text-gray-800 dark:text-slate-200 select-all truncate">
                {activeAuthor || "(Trống - Tác giả mới)"}
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-gray-600 dark:text-slate-350">Email mục tiêu (MAIL BẤM):</label>
                {detectedEmail && (
                  <span className="text-[10px] text-green-650 dark:text-green-400 font-bold flex items-center gap-0.5">
                    <Check className="w-2.5 h-2.5" /> Tự nhận diện
                  </span>
                )}
              </div>
              <input
                type="email"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                placeholder={detectedEmail || "Nhập mail thủ công để dán thẻ..."}
                className="w-full text-xs bg-white dark:bg-[#161b22] border border-gray-200 dark:border-[#30363d] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-850 dark:text-slate-200 font-medium"
              />
              {!targetEmail && (
                <div className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium mt-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  Cần Email mục tiêu để di chuyển thẻ sang tab MAIL BẤM
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Assigned card section for the author */}
          <div className="lg:col-span-8 flex flex-col justify-between p-4 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-slate-800 rounded-xl min-h-[200px]">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400">
                  Thẻ được gán cho Tác giả này
                </span>
                {(tabAssignedCards.length > 0 || tabCompletedCards.length > 0) && (
                  <button
                    onClick={handleResetCards}
                    disabled={isAnyCardProcessing}
                    className="text-[10px] text-red-600 hover:text-red-750 dark:text-red-400 dark:hover:text-red-305 font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Giải phóng / Reset
                  </button>
                )}
              </div>

              {/* Cards pool or lists */}
              {tabAssignedCards.length === 0 && tabCompletedCards.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-gray-200 dark:border-slate-800 rounded-xl space-y-3">
                  <Sparkles className="w-8 h-8 text-indigo-400 dark:text-indigo-500 animate-pulse" />
                  <div className="text-xs text-gray-400 max-w-sm px-4">
                    Chưa có thẻ nào được gán cho tác giả này. Nhấp nút bên dưới để chọn ngẫu nhiên 5 thẻ từ Google Sheet.
                  </div>
                  <button
                    onClick={handleAssignCards}
                    disabled={availableCards.length === 0 || isAnyCardProcessing}
                    className="flex items-center gap-1 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/20 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:text-indigo-755 dark:hover:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-200 dark:border-indigo-900 text-xs font-bold rounded-lg transition-all cursor-pointer"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    Lấy 5 thẻ ngẫu nhiên
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Assigned Uncompleted Cards */}
                  {tabAssignedCards.map((card: string, idx: number) => {
                    const isProcessing = !!processingCards[card];
                    const isDuplicate = !!duplicateCards[card];
                    const parsed = parseCardString(card);
                    const cardNumberOnly = parsed.cardNumber;
                    return (
                      <div
                        key={`assigned-${idx}`}
                        className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-lg border transition-all group ${
                          isDuplicate 
                            ? "bg-red-50/10 dark:bg-red-950/5 border-red-300 dark:border-red-900/50 hover:border-red-400" 
                            : "bg-gray-50 dark:bg-[#0d1117]/60 border-gray-150 dark:border-slate-855 hover:border-indigo-300 dark:hover:border-indigo-900"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <button
                            disabled={isAnyCardProcessing}
                            onClick={() => handleToggleCard(card)}
                            className="text-gray-400 hover:text-green-650 dark:hover:text-green-400 transition-colors shrink-0 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                            title="Tích chọn nếu dán thành công vào Google (Sẽ chuyển thẻ sang tab MAIL BẤM)"
                          >
                            {isProcessing ? (
                              <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />
                            ) : (
                              <div className="w-4 h-4 rounded border border-gray-300 dark:border-slate-700 flex items-center justify-center hover:bg-green-50 dark:hover:bg-green-950/20">
                                <div className="w-2.5 h-2.5 rounded-sm bg-green-600 dark:bg-green-500 scale-0 group-hover:scale-100 transition-transform" />
                              </div>
                            )}
                          </button>
                          
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`font-mono text-sm font-bold select-all tracking-wider ${
                                isDuplicate ? "text-red-655 dark:text-red-455" : "text-gray-800 dark:text-slate-200"
                              }`}>
                                {parsed.cardNumber}
                              </span>
                              {parsed.expiry && (
                                <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-650 dark:text-indigo-400 text-[10px] font-semibold rounded">
                                  Hạn: {parsed.expiry}
                                </span>
                              )}
                              {parsed.cvv && (
                                <span className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-[10px] font-semibold rounded">
                                  CVV: {parsed.cvv}
                                </span>
                              )}
                              {isDuplicate && (
                                <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 text-[10px] font-bold rounded uppercase tracking-wider animate-pulse">
                                  Đã trùng trong MAIL BẤM
                                </span>
                              )}
                            </div>
                            {parsed.details && (
                              <div className="text-[10px] text-gray-455 dark:text-slate-455 truncate" title={parsed.details}>
                                {parsed.details}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-1.5 shrink-0 self-end sm:self-center">
                          <button
                            onClick={() => handleCopy(cardNumberOnly, `sheet-card-${idx}`)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-[#161b22] border border-gray-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-[#30363d] text-gray-700 dark:text-slate-350 hover:text-indigo-650 rounded text-xs font-semibold transition-all cursor-pointer shadow-xs"
                            title="Click để Copy chỉ riêng Số thẻ"
                          >
                            {copiedId === `sheet-card-${idx}` ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-green-600 animate-scale" />
                                <span className="text-[10px]">Đã Copy</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 opacity-60" />
                                <span className="text-[10px]">Copy Số Thẻ</span>
                              </>
                            )}
                          </button>
                          
                          <button
                            disabled={isAnyCardProcessing}
                            onClick={() => handleReleaseSingleCard(card)}
                            className="p-1.5 hover:bg-gray-150 dark:hover:bg-slate-800 text-gray-400 hover:text-indigo-600 rounded transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                            title="Hủy gán thẻ (Trả thẻ về pool chung cho người khác bốc, không bôi vàng)"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>

                          <button
                            disabled={isAnyCardProcessing}
                            onClick={() => handleMarkErrorCard(card)}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-400 hover:text-red-650 rounded transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                            title="Xóa thẻ (Thẻ lỗi, giữ nguyên trên Sheet nhưng tô màu vàng và xóa email gán)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Completed / Checked Cards */}
                  {tabCompletedCards.map((card: string, idx: number) => (
                    <div
                      key={`completed-${idx}`}
                      className="flex items-center justify-between gap-3 bg-green-50/20 dark:bg-green-950/5 p-2.5 rounded-lg border border-green-150 dark:border-green-950/40 opacity-70"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <Check className="w-4 h-4 text-green-600 shrink-0" />
                        <span className="font-mono text-xs text-gray-500 dark:text-slate-400 line-through select-all truncate">
                          {card}
                        </span>
                      </div>
                      <span className="text-[9px] bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                        Đã dán Sheet
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pick extra cards button if they completed some cards */}
            {tabAssignedCards.length < 5 && (tabAssignedCards.length > 0 || tabCompletedCards.length > 0) && (
              <div className="mt-3 flex justify-end">
                <button
                  onClick={handleAssignCards}
                  disabled={availableCards.length === 0 || isAnyCardProcessing}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/20 hover:bg-indigo-100 dark:hover:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Bổ sung thêm thẻ ngẫu nhiên
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid of Parsed Cards */}
      {splitterInput ? (
        visibleConfigs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleConfigs.map((config, cardIdx) => {
              const rawValue = columns[config.colIndex] || "";
              
              // Handle SSN column formatting specifically if labeled "SSN" and contains semicolons
              let items: SplitItem[] = [];
              const isSsn = config.label.toUpperCase() === "SSN";
              
              if (isSsn && rawValue.includes(";")) {
                items = parseSsnField(rawValue);
              } else {
                let stringItems: string[] = [];
                if (config.splitChar && rawValue.includes(config.splitChar)) {
                  stringItems = rawValue.split(config.splitChar).map(item => item.trim()).filter(item => item);
                } else if (rawValue.includes("|")) {
                  stringItems = rawValue.split("|").map(item => item.trim()).filter(item => item);
                } else {
                  stringItems = [rawValue];
                }

                if (config.label === "ADRESS") {
                  stringItems = processAddressItems(stringItems);
                }
                
                items = stringItems.map(val => ({ value: val }));
              }

              return (
                <div
                  key={cardIdx}
                  className="bg-white dark:bg-[#161b22] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col justify-between"
                >
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400 mb-3">
                      {config.label}
                    </h3>
                    <div className="space-y-3">
                      {items.map((item, itemIdx) => {
                        const copyKey = `splitter-${config.label}-${itemIdx}`;
                        const isLink = item.value.startsWith("http://") || item.value.startsWith("https://");
                        return (
                          <div key={itemIdx} className="space-y-1 w-full">
                            {item.label && (
                              <span className="text-[10px] font-bold text-indigo-500/80 dark:text-indigo-400/80 block ml-1 uppercase tracking-wide">
                                {item.label}
                              </span>
                            )}
                            <div className="flex items-center gap-2 w-full">
                              <button
                                onClick={() => handleCopy(item.value, copyKey)}
                                className="flex-1 min-w-0 flex items-center justify-between gap-2 bg-gray-50 dark:bg-[#0d1117]/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 active:bg-indigo-100 dark:active:bg-indigo-950 border border-gray-200 dark:border-[#30363d] hover:border-indigo-300 dark:hover:border-indigo-800 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-slate-200 font-medium transition-all cursor-pointer text-left group"
                                title={`Click to copy: ${item.value}`}
                              >
                                <span className="flex-1 min-w-0 truncate select-all">{item.value}</span>
                                <span className="shrink-0 text-gray-400 group-hover:text-indigo-600 transition-colors">
                                  {copiedId === copyKey ? (
                                    <Check className="w-4 h-4 text-green-600 animate-scale" />
                                  ) : (
                                    <Copy className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                                  )}
                                </span>
                              </button>
                              {isLink && (
                                <a
                                  href={item.value}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 bg-gray-50 dark:bg-[#0d1117]/80 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 active:bg-indigo-100 dark:active:bg-indigo-950 border border-gray-200 dark:border-[#30363d] hover:border-indigo-300 dark:hover:border-indigo-800 text-gray-400 hover:text-indigo-600 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0"
                                  title="Mở liên kết trong tab mới"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Render Live TOTP code if it is the 2FA key field */}
                    {config.label === "2FA" && rawValue && (
                      <TotpDisplay
                        secret={rawValue}
                        copiedId={copiedId}
                        handleCopy={handleCopy}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#161b22] p-12 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 text-center text-gray-400 text-sm">
            Tất cả các cột dữ liệu đều trống.
          </div>
        )
      ) : (
        <div className="bg-white dark:bg-[#161b22] p-12 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 text-center text-gray-400 text-sm">
          Vui lòng dán dữ liệu hàng từ Sheet để bắt đầu phân tách.
        </div>
      )}

      {/* Configure Custom Formats Modal */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#161b22] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-slate-800 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-[#0d1117]/50">
              <h3 className="text-md font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Cấu hình Format Sheet
              </h3>
              <button
                onClick={() => setIsConfigOpen(false)}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-full text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 flex overflow-hidden min-h-[50vh]">
              {/* Left Panel: Format List */}
              <div className="w-1/3 border-r border-gray-150 dark:border-slate-800 p-4 overflow-y-auto bg-gray-50/50 dark:bg-[#0d1117]/20 flex flex-col gap-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Danh sách Format</h4>
                
                <button
                  onClick={() => {
                    setSelectedEditFormatId("new");
                    setEditFormatName("Format Mới");
                    setEditFields([{ label: "STT", colIndex: 0 }]);
                  }}
                  className={`w-full flex items-center justify-center gap-1.5 py-2.5 px-3 border border-dashed rounded-xl text-xs font-semibold transition-all ${
                    selectedEditFormatId === "new"
                      ? "border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-bold"
                      : "border-gray-300 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-500 hover:bg-gray-100 dark:hover:bg-slate-850 text-gray-600 dark:text-slate-300"
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  + Thêm Format mới
                </button>

                <div className="space-y-1.5 mt-2">
                  <div className="text-xs text-gray-400 font-medium px-2 mb-1">Mặc định</div>
                  <button
                    disabled={true}
                    className="w-full flex items-center justify-between py-2 px-3 bg-gray-100 dark:bg-slate-800 border border-gray-205 dark:border-slate-750 rounded-xl text-xs font-semibold text-gray-500 dark:text-slate-400 cursor-not-allowed opacity-80"
                  >
                    <span>Mặc định hệ thống</span>
                  </button>
                </div>

                {sheetFormats.length > 0 && (
                  <div className="space-y-1.5 mt-4">
                    <div className="text-xs text-gray-400 font-medium px-2 mb-1">Tự định nghĩa</div>
                    {sheetFormats.map((format) => (
                      <div
                        key={format.id}
                        className={`group w-full flex items-center justify-between rounded-xl border p-1 text-xs font-semibold transition-all cursor-pointer ${
                          selectedEditFormatId === format.id
                            ? "border-indigo-300 dark:border-indigo-850 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300"
                            : "border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-850 text-gray-700 dark:text-slate-300"
                        }`}
                        onClick={() => {
                          setSelectedEditFormatId(format.id);
                          setEditFormatName(format.name);
                          setEditFields([...format.fields]);
                        }}
                      >
                        <span className="truncate flex-1 py-1.5 px-2">{format.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFormat(format.id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-650 rounded-lg hover:bg-white dark:hover:bg-slate-800 active:bg-gray-155 transition-colors"
                          title="Xóa format này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Panel: Editor Form */}
              <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Tên Format
                  </label>
                  <input
                    type="text"
                    value={editFormatName}
                    onChange={(e) => setEditFormatName(e.target.value)}
                    placeholder="Nhập tên format (Ví dụ: Sheet TikTok Shop)"
                    className="w-full p-2.5 bg-gray-50 dark:bg-[#0d1117] border border-gray-200 dark:border-[#30363d] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-800 dark:text-slate-200 shadow-inner"
                  />
                </div>

                {/* Quick Import Header Row */}
                <div className="bg-indigo-50/50 dark:bg-indigo-950/10 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-950/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider block">
                      Nhập nhanh từ hàng tiêu đề (Headers)
                    </label>
                    <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium">
                      Ngăn cách bằng phím Tab (Copy từ Sheet)
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="Dán hàng tiêu đề vào đây... (Ví dụ: STT		SSN	GMAIL	PASS...)"
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        const parsed = parseHeaderRow(val);
                        if (parsed.length > 0) {
                          setEditFields(parsed);
                        }
                      }
                    }}
                    className="w-full p-2 bg-white dark:bg-[#0d1117] border border-indigo-200 dark:border-[#30363d] focus:border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs text-gray-800 dark:text-slate-200 font-mono shadow-sm"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Cấu hình các cột ({editFields.length})
                    </label>
                    <button
                      onClick={() => {
                        setEditFields([...DEFAULT_FIELDS]);
                      }}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold cursor-pointer"
                    >
                      Sao chép từ Mặc định
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[38vh] overflow-y-auto border border-gray-150 dark:border-slate-800 rounded-xl p-3 bg-gray-50/30 dark:bg-[#0d1117]/20 custom-scrollbar">
                    {editFields.map((field, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white dark:bg-[#161b22] p-2 rounded-lg border border-gray-200 dark:border-slate-800 shadow-xs">
                        <div className="w-20 shrink-0">
                          <span className="text-[10px] font-bold text-gray-400 block mb-0.5">Cột Index</span>
                          <input
                            type="number"
                            min="0"
                            value={field.colIndex}
                            onChange={(e) => {
                              const updated = [...editFields];
                              updated[idx] = { ...field, colIndex: parseInt(e.target.value) || 0 };
                              setEditFields(updated);
                            }}
                            className="w-full p-1 bg-white dark:bg-[#0d1117] border border-gray-250 dark:border-[#30363d] rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center font-semibold text-gray-800 dark:text-slate-200"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-bold text-gray-400 block mb-0.5">Nhãn hiển thị</span>
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => {
                              const updated = [...editFields];
                              updated[idx] = { ...field, label: e.target.value };
                              setEditFields(updated);
                            }}
                            placeholder="Ví dụ: PASS, 2FA, SSN"
                            className="w-full p-1 bg-white dark:bg-[#0d1117] border border-gray-255 dark:border-[#30363d] rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-gray-800 dark:text-slate-200"
                          />
                        </div>

                        <div className="w-28 shrink-0">
                          <span className="text-[10px] font-bold text-gray-400 block mb-0.5">Phân tách (Split)</span>
                          <input
                            type="text"
                            value={field.splitChar || ""}
                            onChange={(e) => {
                              const updated = [...editFields];
                              updated[idx] = { ...field, splitChar: e.target.value || undefined };
                              setEditFields(updated);
                            }}
                            placeholder="Ví dụ: | hoặc ,"
                            className="w-full p-1 bg-white dark:bg-[#0d1117] border border-gray-255 dark:border-[#30363d] rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center font-medium text-gray-800 dark:text-slate-200"
                          />
                        </div>

                        <button
                          onClick={() => {
                            const updated = editFields.filter((_, fIdx) => fIdx !== idx);
                            setEditFields(updated);
                          }}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-400 hover:text-red-500 rounded-md transition-colors self-end"
                          title="Xóa cột này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    {editFields.length === 0 && (
                      <div className="text-center py-6 text-xs text-gray-400">
                        Chưa cấu hình cột nào. Nhấp nút bên dưới để thêm.
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      const maxIndex = editFields.reduce((max, f) => f.colIndex > max ? f.colIndex : max, -1);
                      setEditFields([
                        ...editFields,
                        { label: `Cột mới`, colIndex: maxIndex + 1 }
                      ]);
                    }}
                    className="w-full flex items-center justify-center gap-1 py-2 border border-dashed border-gray-300 dark:border-slate-800 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/10 text-gray-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-semibold rounded-xl mt-3 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm cột cấu hình mới
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-gray-150 dark:border-slate-800 flex items-center justify-end gap-2 bg-gray-50 dark:bg-[#0d1117]/50">
              <button
                onClick={() => setIsConfigOpen(false)}
                className="px-4 py-2 border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-150 dark:hover:bg-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveEditFormat}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                {selectedEditFormatId === "new" ? "Tạo Format" : "Lưu Thay Đổi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

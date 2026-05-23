import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

export function exportToExcel(summaryData, monthLabel, plantInfo) {
  const { summary, grand_avg, total_penalty, benchmark } = summaryData;

  const wb = XLSX.utils.book_new();
  const rows = [];

  rows.push(["5.0 KEY DELIVERABLES- Annexure 6"]);
  rows.push(["5.4 HOUSEKEEPING SHORTFALLS- KD3"]);
  rows.push(["Package", "", plantInfo?.package_name || "SWPGPL Plant", "", "", "Benchmark", "", `As per agreed SLA (${plantInfo?.grade || "Grade 3.5"})`]);
  rows.push(["Assessment Month", "", monthLabel, "", "", "Key Deliverable No-", "", plantInfo?.key_deliverable_no || "3"]);
  rows.push([]);
  rows.push([
    "Sl. No", "Area", "Sub description", "Benchmark",
    "Grade W1", "W1 Avg", "Grade W2", "W2 Avg",
    "Grade W3", "W3 Avg", "Grade W4", "W4 Avg",
    "Monthly Avg", "Area In-Charge", "Penalty", "OEG Remark", "Remark"
  ]);

  summary.forEach(area => {
    const hasMultipleSubs = area.sub_areas.length > 1;
    area.sub_areas.forEach((sub, si) => {
      const row = [];
      row.push(si === 0 ? area.area_number : "");
      row.push(si === 0 ? area.area_name : "");
      row.push(hasMultipleSubs ? sub.name : "");
      row.push(si === 0 ? benchmark : "");
      [1,2,3,4].forEach(w => {
        const wd = area.week_data.find(x => x.week === w);
        const g = wd?.grades.find(g => g.sub_id === sub.id);
        row.push(g?.grade ?? "");
        if (si === 0) row.push(wd?.avg != null ? +wd.avg.toFixed(4) : "");
        else row.push("");
      });
      row.push(si === 0 && area.monthly_avg != null ? +area.monthly_avg.toFixed(4) : "");
      row.push(si === 0 ? (area.in_charge || "") : "");
      row.push(si === 0 ? (area.penalty > 0 ? +area.penalty.toFixed(2) : 0) : "");
      const oegRemark = area.remarks?.find(r => r.remark_type === "oeg")?.remark_text || "";
      const genRemark = area.remarks?.find(r => r.remark_type === "general")?.remark_text || "";
      row.push(si === 0 ? oegRemark : "");
      row.push(si === 0 ? genRemark : "");
      rows.push(row);
    });
  });

  rows.push([]);
  rows.push(["", "", "Grand Total", "", "", "", "", "",
    "", "", "", "",
    grand_avg != null ? +grand_avg.toFixed(6) : "",
    "", total_penalty != null ? +total_penalty.toFixed(2) : ""
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [8,30,30,10,10,10,10,10,10,10,10,10,12,20,12,20,20].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, "KD-3");
  XLSX.writeFile(wb, `SaiWardha_KD3_${monthLabel.replace(/\s/g,"_")}.xlsx`);
}

export function exportToPDF(summaryData, monthLabel, plantInfo) {
  const { summary, grand_avg, total_penalty, benchmark } = summaryData;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("SAI WARDHA POWER GENERATION PVT LTD", doc.internal.pageSize.width / 2, 15, { align: "center" });
  doc.setFontSize(11);
  doc.text("5.4 HOUSEKEEPING SHORTFALLS - KD3", doc.internal.pageSize.width / 2, 22, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Package: ${plantInfo?.package_name || "SWPGPL Plant"}`, 14, 30);
  doc.text(`Assessment Month: ${monthLabel}`, 14, 36);
  doc.text(`Benchmark: ${benchmark}`, 14, 42);
  doc.text(`SLA: ${plantInfo?.sla_description || "As per agreed SLA (Grade 3.5)"}`, 100, 30);
  doc.text(`Key Deliverable No: ${plantInfo?.key_deliverable_no || "3"}`, 100, 36);

  const tableRows = [];
  summary.forEach(area => {
    const hasMultipleSubs = area.sub_areas.length > 1;
    area.sub_areas.forEach((sub, si) => {
      const row = [
        si === 0 ? area.area_number : "",
        si === 0 ? area.area_name : "",
        hasMultipleSubs ? sub.name : "-",
        si === 0 ? benchmark : "",
      ];
      [1,2,3,4].forEach(w => {
        const wd = area.week_data.find(x => x.week === w);
        const g = wd?.grades.find(g => g.sub_id === sub.id);
        row.push(g?.grade != null ? g.grade.toFixed(1) : "-");
        row.push(si === 0 && wd?.avg != null ? wd.avg.toFixed(2) : "");
      });
      row.push(si === 0 && area.monthly_avg != null ? area.monthly_avg.toFixed(4) : "");
      row.push(si === 0 ? (area.in_charge || "-") : "");
      row.push(si === 0 ? (area.penalty > 0 ? area.penalty.toFixed(2) : "0") : "");
      const oeg = area.remarks?.find(r => r.remark_type === "oeg")?.remark_text || "";
      const gen = area.remarks?.find(r => r.remark_type === "general")?.remark_text || "";
      row.push(si === 0 ? oeg : "");
      row.push(si === 0 ? gen : "");
      tableRows.push(row);
    });
  });

  tableRows.push([
    "", "Grand Total", "", "",
    "","","","","","","","","",
    grand_avg != null ? grand_avg.toFixed(4) : "",
    "", total_penalty != null ? total_penalty.toFixed(2) : "",
    "","",
  ]);

  doc.autoTable({
    startY: 48,
    head: [[
      "#","Area","Sub Area","Bmk",
      "W1","W1Avg","W2","W2Avg","W3","W3Avg","W4","W4Avg",
      "Monthly Avg","In-Charge","Penalty","OEG Remark","Remark"
    ]],
    body: tableRows,
    styles: { fontSize: 6.5, cellPadding: 1.5, overflow: "linebreak" },
    headStyles: { fillColor: [26,53,96], textColor: 255, fontStyle: "bold", fontSize: 7 },
    columnStyles: {
      0: { cellWidth: 8 }, 1: { cellWidth: 40 }, 2: { cellWidth: 35 },
      3: { cellWidth: 10 }, 4: { cellWidth: 10 }, 5: { cellWidth: 12 },
      6: { cellWidth: 10 }, 7: { cellWidth: 12 }, 8: { cellWidth: 10 },
      9: { cellWidth: 12 }, 10: { cellWidth: 10 }, 11: { cellWidth: 12 },
      12: { cellWidth: 16 }, 13: { cellWidth: 24 }, 14: { cellWidth: 14 },
      15: { cellWidth: 28 }, 16: { cellWidth: 28 }
    },
    alternateRowStyles: { fillColor: [240, 245, 255] },
    didParseCell: (data) => {
      if (data.row.index === tableRows.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [200, 220, 255];
      }
    }
  });

  doc.save(`SaiWardha_KD3_${monthLabel.replace(/\s/g,"_")}.pdf`);
}

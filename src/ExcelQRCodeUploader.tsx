import React, { useState, useCallback, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button"
import QRCode from 'qrcode';
import * as XLSX from "xlsx";
import jsPDF from 'jspdf';

interface QRData {
  label: string;
  value: string;
}

const ExcelQRCodeUploader = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<string[][]>([]); // Changed to string[][]
  const [labelField, setLabelField] = useState<string>("");
  const [qrField, setQrField] = useState<string>("");
  const [qrData, setQrData] = useState<QRData[]>([]);
  const qrCodeCanvasRefs = useRef<HTMLCanvasElement[]>([]);
  
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0] || null;
    if (!uploadedFile) return;
    setFile(uploadedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target?.result) return;

      try {
        const data = new Uint8Array(event.target.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" }); // Ensure string[] and handle empty cells
        setFileData(json as string[][]); // Cast to string[][]
      } catch (error) {
        console.error("Error processing Excel file:", error);
        setFileData([]);
        setQrData([]);
      }
    };
    reader.readAsArrayBuffer(uploadedFile);
  }, []);

  const exportToPDF = useCallback(async () => {
    if (fileData.length < 2) {
      console.warn("File data is too short to process.");
      return;
    }

    const headers = fileData[0];
    const labelIndex = headers.indexOf(labelField);
    const qrIndex = headers.indexOf(qrField);

    if (labelIndex === -1 || qrIndex === -1) {
      console.error(`Label field "${labelField}" or QR field "${qrField}" not found in headers.`);
      return;
    }

    const qrList = fileData.slice(1).map((row) => ({
      label: row[labelIndex] || "",
      value: row[qrIndex] || "",
    })).filter(({ value }) => value !== "");

    setQrData(qrList);

    if (qrList.length === 0) {
      console.warn("No QR codes to generate.");
      return;
    }

    const pdf = new jsPDF();
    const qrCodeSize = 30;
    const margin = 6;
    const maxCodesPerRow = 5;
    const labelFontSize = 5;
    const labelHeight = -0.5;
    const a4XStart = 18;
    const a4YStart = 20;
    let x = a4XStart;
    let y = a4YStart;
    let rowCount = 0;

    pdf.setFontSize(labelFontSize);

    for (let index = 0; index < qrList.length; index++) {
      const { label, value } = qrList[index];

      try {
        const qrCanvas = await QRCode.toCanvas(value, { width: qrCodeSize, color: { light: '#EBEBEB', dark: '#000000' } });
        const qrImage = qrCanvas.toDataURL("image/png");

        const qrX = x;
        const qrY = y;
        const labelX = x + qrCodeSize / 2;
        const labelY = y + qrCodeSize + labelHeight;

        pdf.addImage(qrImage, "PNG", qrX, qrY, qrCodeSize, qrCodeSize);
        pdf.text(label, labelX, labelY, { align: 'center' });

      } catch (error) {
        console.error(`Error generating QR code for label "${label}":`, error);
        continue;
      }

      x += qrCodeSize + margin;
      rowCount++;

      if (rowCount >= maxCodesPerRow || index === qrList.length - 1) {
        x = a4XStart;
        y += qrCodeSize + margin;
        rowCount = 0;
      }

      if (y > pdf.internal.pageSize.height - margin - qrCodeSize) {
        pdf.addPage();
        x = margin;
        y = margin;
        rowCount = 0;
      }
    }
    pdf.save("qrcodes.pdf");
  }, [fileData, labelField, qrField, setQrData]);

  useEffect(() => {
    qrCodeCanvasRefs.current.forEach((canvas, index) => {
      if (qrData[index]) {
        QRCode.toCanvas(canvas, qrData[index].value, { width: 128 }, (error) => {
          if (error) {
            console.error("Error generating QR code:", error);
          }
        });
      }
    });
  }, [qrData]);

  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      <h1>QRCode Generator</h1>
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
      </div>
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Label htmlFor="label">Campo para Label</Label>
        <Input
          type="text"
          id="label"
          placeholder="Coluna a ser usado como label"
          value={labelField}
          onChange={(e) => setLabelField(e.target.value)}
        />
      </div>
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Label htmlFor="qrcode">Campo para QRCode</Label>
        <Input
          type="text"
          id="qrcode"
          placeholder="Coluna a ser parar gerar o QRCode"
          value={qrField}
          onChange={(e) => setQrField(e.target.value)}
        />
      </div>
      <Button disabled={(!file || !labelField || !qrField)} onClick={exportToPDF}>
        Gerar QRCodes
      </Button>
      <div className="flex flex-wrap gap-4 justify-center">
      {qrData.map(({ label }, index) => {
          // Create a ref for each canvas
          qrCodeCanvasRefs.current[index] = qrCodeCanvasRefs.current[index] || document.createElement('canvas'); // Ensure ref exists
          return (
            <div className="p-4 flex flex-col items-center max-w-[240px]" key={index}>
              <canvas ref={(el) => { qrCodeCanvasRefs.current[index] = el || qrCodeCanvasRefs.current[index]; }} width={128} height={128} />
              <span className="text-sm font-semibold">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExcelQRCodeUploader;

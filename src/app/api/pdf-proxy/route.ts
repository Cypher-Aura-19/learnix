import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  if (!url.includes("cloudinary.com")) {
    return new NextResponse("Only Cloudinary URLs are allowed", { status: 403 });
  }

  try {
    const parts = url.split("/");
    const lastSegment = parts[parts.length - 1].split("?")[0];
    const safeName = lastSegment.replace(/[^a-zA-Z0-9_-]/g, "");

    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PDFProxy/1.0)" },
    });

    if (!response.ok) {
      return new NextResponse(`Failed to fetch: ${response.status}`, { status: response.status });
    }

    const buffer = await response.arrayBuffer();
    const nodeBuffer = Buffer.from(buffer);

    const contentType = response.headers.get("content-type") || "";
    let ext = "bin";
    const urlLower = url.toLowerCase();

    if (urlLower.endsWith(".pdf") || contentType.includes("pdf")) {
      ext = "pdf";
    } else if (urlLower.endsWith(".zip") || contentType.includes("zip") || contentType.includes("x-zip-compressed")) {
      ext = "zip";
    } else if (urlLower.endsWith(".pptx") || urlLower.endsWith(".ppt") || contentType.includes("presentation") || contentType.includes("powerpoint") || contentType.includes("vnd.ms-powerpoint")) {
      ext = "pptx";
    } else if (urlLower.endsWith(".docx") || contentType.includes("document") || contentType.includes("msword")) {
      ext = "docx";
    } else if (urlLower.endsWith(".xlsx") || contentType.includes("sheet") || contentType.includes("excel") || contentType.includes("ms-excel")) {
      ext = "xlsx";
    } else if (contentType.includes("text/")) {
      ext = "txt";
    } else if (contentType.includes("image/")) {
      ext = contentType.split("/")[1] || "png";
    }

    // Binary inspection to override extension based on file signatures
    const headerString = nodeBuffer.toString("binary", 0, 100);
    const hasPdfSignature = headerString.includes("%PDF") || nodeBuffer.includes(Buffer.from([0x25, 0x50, 0x44, 0x46]));
    
    if (hasPdfSignature) {
      ext = "pdf";
    } else if (ext === "zip" || ext === "bin") {
      const binaryString = nodeBuffer.toString("binary");
      if (binaryString.includes("ppt/presentation.xml") || binaryString.includes("ppt/")) {
        ext = "pptx";
      } else if (binaryString.includes("word/document.xml") || binaryString.includes("word/")) {
        ext = "docx";
      } else if (binaryString.includes("xl/workbook.xml") || binaryString.includes("xl/")) {
        ext = "xlsx";
      }
    }

    const publicDir = path.join(process.cwd(), "public", "milestone-files");
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    // If file is PPTX, convert it to PDF via standalone child process to bypass SWC build compilation conflicts
    if (ext === "pptx") {
      const tempPptxName = `${safeName}_temp.pptx`;
      const tempPptxPath = path.join(publicDir, tempPptxName);
      
      try {
        fs.writeFileSync(tempPptxPath, nodeBuffer);
        
        const outputPdfName = `${safeName}.pdf`;
        const outputPdfPath = path.join(publicDir, outputPdfName);
        const converterScript = path.join(process.cwd(), "scripts", "convert-pptx.js");
        
        console.log(`Executing isolated PPTX-to-PDF conversion for ${safeName}...`);
        execSync(`node "${converterScript}" "${tempPptxPath}" "${outputPdfPath}"`, { stdio: "inherit" });
        
        if (fs.existsSync(tempPptxPath)) {
          fs.unlinkSync(tempPptxPath);
        }
        
        ext = "pdf";
        const filename = `${safeName}.${ext}`;
        const localUrl = `/milestone-files/${filename}`;
        
        console.log(`PPTX converted locally to same-origin PDF successfully: ${filename}`);
        return NextResponse.json({ 
          localUrl, 
          ext, 
          contentType: "application/pdf" 
        });
      } catch (convError) {
        console.error("Failed to convert PPTX to PDF via child process, falling back to raw save", convError);
        if (fs.existsSync(tempPptxPath)) {
          fs.unlinkSync(tempPptxPath);
        }
      }
    }

    const filename = `${safeName}.${ext}`;
    const filePath = path.join(publicDir, filename);
    const localUrl = `/milestone-files/${filename}`;

    fs.writeFileSync(filePath, nodeBuffer);
    console.log(`Saved ${filename} successfully with detected extension ${ext}`);

    return NextResponse.json({ 
      localUrl, 
      ext, 
      contentType 
    });
  } catch (error) {
    console.error("PDF proxy error:", error);
    return new NextResponse("Failed to proxy file", { status: 500 });
  }
}

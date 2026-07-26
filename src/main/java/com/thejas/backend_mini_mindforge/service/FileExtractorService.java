package com.thejas.backend_mini_mindforge.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Service
public class FileExtractorService {

    public String extract(MultipartFile file) throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty or missing");
        }

        String filename = file.getOriginalFilename();
        if (filename == null) {
            throw new IllegalArgumentException("File name is missing");
        }

        String lower = filename.toLowerCase();

        if (lower.endsWith(".pdf")) {
            return extractPdf(file.getInputStream());
        } else if (lower.endsWith(".docx")) {
            return extractDocx(file.getInputStream());
        } else if (lower.endsWith(".txt")) {
            return new String(file.getBytes(), StandardCharsets.UTF_8);
        } else {
            throw new IllegalArgumentException("Unsupported file type: " + filename + ". Supported types: PDF, DOCX, TXT");
        }
    }

    private String extractPdf(InputStream inputStream) throws Exception {
        try (PDDocument document = Loader.loadPDF(inputStream.readAllBytes())) {
            String text = new PDFTextStripper().getText(document);
            if (text == null || text.isBlank()) {
                throw new IllegalArgumentException("PDF appears to be empty or contains no extractable text");
            }
            return text;
        }
    }

    private String extractDocx(InputStream inputStream) throws Exception {
        try (XWPFDocument document = new XWPFDocument(inputStream)) {
            List<XWPFParagraph> paragraphs = document.getParagraphs();
            StringBuilder sb = new StringBuilder();
            for (XWPFParagraph para : paragraphs) {
                String text = para.getText();
                if (text != null && !text.isBlank()) {
                    sb.append(text).append("\n");
                }
            }
            if (sb.isEmpty()) {
                throw new IllegalArgumentException("DOCX appears to be empty or contains no extractable text");
            }
            return sb.toString();
        }
    }
}

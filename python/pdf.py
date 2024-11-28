from docx import Document
from fpdf import FPDF
import os

def docx_to_text(docx_file):
    doc = Document(docx_file)
    full_text = []
    for para in doc.paragraphs:
        full_text.append(para.text)
    return '\n'.join(full_text)

def merge_docx_to_pdf(docx_files, output_pdf):
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Arial", size=12)

    for docx_file in docx_files:
        text = docx_to_text(docx_file)
        for line in text.split('\n'):
            pdf.multi_cell(0, 10, line)
        pdf.add_page()

    pdf.output(output_pdf)

if __name__ == "__main__":
    docx_files = input("Enter the DOCX files separated by commas: ").split(',')
    docx_files = [file.strip() for file in docx_files]
    output_pdf = input("Enter the output PDF file name: ")
    merge_docx_to_pdf(docx_files, output_pdf)
    print(f"Merged PDF saved as {output_pdf}")
# Senior Data Engineer's Guide: Analytics PDF Representation

As a senior data engineer, representing complex analytical data in a static PDF format requires a balance of **visual clarity**, **data density**, and **contextual insights**. Teachers need to quickly identify patterns, outliers, and actionable areas without being overwhelmed by raw numbers.

## 1. Hierarchy of Information
A professional report should follow a "Drill-Down" structure:
1.  **Executive Summary**: High-level KPIs (Overall Average, Attendance, Recent Trends).
2.  **Class Performance**: Comparative metrics (Subject Averages, Attendance vs Marks Correlation).
3.  **Student Deep-Dive**: Individualized progress charts and radar diagrams.
4.  **Granular Details**: Chapter/Topic mastery lists.

## 2. Visual Style & Color Palette
*   **Vector Graphics**: Always use SVG/Vector formats for charts to ensure crispness at any zoom level.
*   **Safe Colors**: Use high-contrast colors optimized for white paper. Avoid neon or overly bright colors that may look washed out when printed.
    *   *Primary Blue*: `#1e40af` (Trustworthy, Clear)
    *   *Secondary Green*: `#15803d` (Growth, Positive)
    *   *Accent Orange*: `#ea580c` (Attention, Action)
*   **Typography**: Use a clean, sans-serif font like Inter or Roboto. Use bold weights for headers and slightly larger fonts for KPIs.

## 3. Recommended Chart Representations

### A. Performance History (Line/Area Chart)
*   **Representation**: Area chart with a subtle gradient.
*   **Context**: Include a "Class Average" line as a benchmark for individual student reports.
*   **Action**: Highlight the last 3 data points to emphasize recent trajectory.

### B. Subject Mastery (Radar Chart)
*   **Representation**: Radar chart with shaded areas.
*   **Benefit**: Excellent for seeing if a student is "balanced" or has specific subject spikes/dips.

### C. Correlation Analysis (Scatter Plot)
*   **Representation**: Scatter plot for Attendance vs. Marks.
*   **Data Highlight**: Include a Trend Line (Linear Regression). Circle "Outliers" (students with high attendance but low marks) as they might need direct intervention.

### D. Mastery Breakdown (Heatmaps or Ranked Lists)
*   **Representation**: A ranked list of "Top Strengths" and "Critical Weaknesses."
*   **UX**: Use color-coded badges (Green for >80%, Amber for 50-80%, Red for <50%).

## 4. PDF Layout Specifications (A4 Standard)
*   **Margins**: 15mm-20mm on all sides.
*   **Header**: School Logo (Top Left), Report Date & Class Name (Top Right).
*   **Watermark**: Subtle school logo watermark at 5% opacity in the center.
*   **Page Numbering**: "Page X of Y" in the footer.
*   **Non-Splitting**: Ensure charts are never split across two pages (use `page-break-inside: avoid`).

## 5. Senior Data Engineer Prompt for PDF Generation

**Prompt for LLM/PDF-Engine:**
> "Generate a professional A4 school analytics report for [Class Name]. The report must follow a clean, corporate aesthetic using deep blues (#1e40af) and forest greens (#15803d). 
> 
> **Structure:**
> 1. **Header:** school logo, school name, and date.
> 2. **Summary Tile:** 3 cards showing 'Overall Avg Score', 'Mean Attendance', and 'Top Performing Subject'.
> 3. **Main Dashboard:** 
>    - A high-resolution line chart showing 'Score vs Attendance' over 6 months.
>    - A vertical bar chart comparing averages across all subjects.
> 4. **Correlation Section:** A scatter plot of Attendance vs Marks with a linear regression trend line.
> 5. **Individual Student Profile:** For each student, display a 2-column layout:
>    - Left: A Radar Chart of subject mastery.
>    - Right: Two sections titled 'Dominant Strengths' and 'Targeted Weaknesses' with color-coded mastery percentages.
> 6. **Footer:** Page numbers and 'Powered by Nuvana'.
> 
> **Constraints:** No neon colors, use professional grid lines (stroke: #e2e8f0), and ensure all text is legible (min 10pt for data, 14pt for headers)."

---
*Prepared by Nuvana Senior Data Engineering Team*

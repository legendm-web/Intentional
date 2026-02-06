// --- APP STATE & MEMORY ---

// Save a search term to local storage
function saveToHistory(query) {
    if (!query) return;
    let history = JSON.parse(localStorage.getItem("search_history") || "[]");
    
    // Add new query to the start, remove duplicates, and limit to 5 items
    history = [query, ...history.filter(q => q !== query)].slice(0, 5);
    
    localStorage.setItem("search_history", JSON.stringify(history));
    renderHistory();
}

// Display the history chips on the screen
function renderHistory() {
    const container = document.getElementById("search-history");
    if (!container) return;
    
    const history = JSON.parse(localStorage.getItem("search_history") || "[]");
    
    if (history.length === 0) {
        container.innerHTML = "";
        return;
    }

    container.innerHTML = history.map(q => `
        <span onclick="document.getElementById('q').value='${q}'; doSearch();" 
              style="background:#333; color:#aaa; padding:5px 12px; border-radius:20px; cursor:pointer; font-size:12px;">
            ${q}
        </span>
    `).join("");
}

// Run history render when the page loads
document.addEventListener("DOMContentLoaded", renderHistory);

// Deutsche Bildungsstiftung - Main Application
// CONFIG & DEMO DATA
const config = {
    grossReturn: 0.07,  // 7%
    payoutRate: 0.01,   // 1%
    get netGrowthRate() { return this.grossReturn - this.payoutRate } // 6%
};

const schoolsData = [
    { id: 1, name: 'Grundschule Sonnenhügel', city: 'Berlin', students: 250, fund: 50000, payoutPerChild: 10 },
    { id: 2, name: 'Gymnasium Neustadt', city: 'Hamburg', students: 800, fund: 450000, payoutPerChild: 15 },
    { id: 3, name: 'Kita Wirbelwind', city: 'München', students: 60, fund: 15000, payoutPerChild: 20 },
    { id: 4, name: 'Realschule am Fluss', city: 'Köln', students: 450, fund: 120000, payoutPerChild: 10 },
    { id: 5, name: 'Gesamtschule Westend', city: 'Dortmund', students: 1200, fund: 300000, payoutPerChild: 5 },
    { id: 6, name: 'Förderschule Pestalozzi', city: 'Bremen', students: 90, fund: 80000, payoutPerChild: 25 },
];

// GLOBAL VARIABLES
const pages = document.querySelectorAll('.page');
const navLinks = document.querySelectorAll('nav a, .cta-button');

// PAGE NAVIGATION
function navigateTo(pageId) {
    // Update URL hash
    window.location.hash = pageId;
    
    // Show/hide pages
    pages.forEach(page => {
        page.classList.remove('active');
        if (page.id === pageId) {
            page.classList.add('active');
        }
    });
    
    // Update active nav link
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === pageId) {
            link.classList.add('active');
        }
    });

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Announce page change for screen readers
    announcePageChange(pageId);
}

function announcePageChange(pageId) {
    const pageNames = {
        'home': 'Startseite',
        'schools': 'Schulen finden',
        'model': 'Unser Modell',
        'school-detail-view': 'Schuldetails'
    };
    
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = `Navigiert zu ${pageNames[pageId] || pageId}`;
    
    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
}

// EVENT LISTENERS FOR NAVIGATION
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const pageId = e.target.getAttribute('data-page');
        if (pageId) {
            navigateTo(pageId);
        }
    });
    
    // Keyboard navigation
    link.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            link.click();
        }
    });
});

// BACK BUTTON HANDLING
document.addEventListener('click', (e) => {
    if (e.target.getAttribute('data-page')) {
        e.preventDefault();
        const pageId = e.target.getAttribute('data-page');
        navigateTo(pageId);
    }
});

// BROWSER BACK/FORWARD BUTTON SUPPORT
window.addEventListener('hashchange', () => {
    const hash = window.location.hash.slice(1);
    if (hash && document.getElementById(hash)) {
        navigateTo(hash);
        
        // Special handling for school-detail-view
        if (hash === 'school-detail-view') {
            // Try to load the first school as fallback
            const firstSchool = schoolsData[0];
            if (firstSchool) {
                console.log('🔧 Loading fallback school on direct navigation:', firstSchool.name);
                showSchoolDetail(firstSchool.id);
            }
        }
    }
});

// POPULATE SCHOOL LIST
function populateSchoolList() {
    const schoolListContainer = document.getElementById('school-list');
    if (!schoolListContainer) return;
    
    schoolListContainer.innerHTML = '';
    schoolListContainer.setAttribute('role', 'list');
    
    schoolsData.forEach((school, index) => {
        const card = document.createElement('div');
        card.className = 'school-card';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `${school.name} in ${school.city} auswählen`);
        
        card.innerHTML = `
            <div>
                <h4>${school.name}</h4>
                <p>${school.city} | ${school.students} Kinder/Schüler</p>
            </div>
            <div class="stats">
                <p><strong>${formatCurrency(school.fund)}</strong> im Fonds</p>
            </div>
        `;
        
        // Click handler
        card.addEventListener('click', () => showSchoolDetail(school.id));
        
        // Keyboard handler
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                showSchoolDetail(school.id);
            }
        });
        
        schoolListContainer.appendChild(card);
    });
}

// SHOW SCHOOL DETAIL VIEW - V3.2.1 CACHE-BUST FIX
function showSchoolDetail(schoolId) {
    console.log('🔥 CACHE-BUST: showSchoolDetail called with ID:', schoolId);
    
    const school = schoolsData.find(s => s.id === schoolId);
    if (!school) {
        console.error('❌ School not found:', schoolId);
        return;
    }

    console.log('✅ School found:', school.name);
    document.getElementById('school-name-detail').textContent = school.name;
    const detailContainer = document.getElementById('school-detail-view-container');
    
    const desiredPayout = school.payoutPerChild * school.students;
    const targetFund = desiredPayout / config.payoutRate;
    
    console.log('💰 Target fund calculated:', targetFund);

    const contentHTML = `
        <div class="school-info">
            <h3>Das Ziel: Ewige Förderung</h3>
            <p>Das finanzielle Ziel für diese Einrichtung beträgt <strong>${formatCurrency(targetFund)}</strong>. Sobald dieses Kapital erreicht ist, können aus den jährlichen Zinserträgen <strong>${formatCurrency(desiredPayout)}</strong> (entspricht ${formatCurrency(school.payoutPerChild)} pro Kind) ausgeschüttet werden – und das jedes Jahr, ohne das Stiftungskapital anzugreifen.</p>
            <ul>
                <li><strong>Aktuelles Fondsvolumen:</strong> ${formatCurrency(school.fund)}</li>
                <li><strong>Anzahl Kinder/Schüler:</strong> ${school.students}</li>
                <li><strong>Standort:</strong> ${school.city}</li>
            </ul>
        </div>
        <div class="donation-box">
            <h3>Beschleunigen Sie das Ziel!</h3>
            <div class="donation-controls">
                <label for="donation-frequency">Spendenfrequenz:</label>
                <select id="donation-frequency" aria-label="Spendenfrequenz auswählen">
                    <option value="once">Einmalig</option>
                    <option value="monthly">Monatlich</option>
                    <option value="yearly" selected>Jährlich</option>
                </select>
                
                <label for="donation-slider" id="donation-slider-label">Ihre jährliche Spende:</label>
                <span class="donation-amount" aria-live="polite">€50</span>
                <input type="range" id="donation-slider" min="10" max="500" step="10" value="50" 
                       aria-label="Spendenbetrag auswählen" aria-describedby="donation-amount">
            </div>
            
            <div class="impact-visualization" role="region" aria-label="Spendenauswirkung">
                <div class="metric">
                    <span class="metric-label">Jahre bis zum Ziel (ohne Ihre Hilfe):</span>
                    <span class="metric-value" id="years-without-help" aria-live="polite">...</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Jahre bis zum Ziel (mit Ihrer Hilfe):</span>
                    <span class="metric-value" id="years-with-help" aria-live="polite">...</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Ihre Zeitersparnis:</span>
                    <span class="metric-value highlight" id="time-saved" aria-live="polite">...</span>
                </div>
            </div>

            <button class="cta-button" style="width: 100%; margin-top: 20px;" 
                    onclick="handleDonation()" aria-describedby="donation-amount">
                Jetzt jährlich spenden
            </button>
        </div>
    `;
    detailContainer.innerHTML = contentHTML;
    
    // CRITICAL DEBUG: Verify elements exist
    console.log('🔍 HTML set. Checking elements...');
    console.log('detailContainer content:', detailContainer.innerHTML.substring(0, 200));
    
    // Setup donation calculator
    const slider = document.getElementById('donation-slider');
    const frequencySelect = document.getElementById('donation-frequency');
    
    console.log('slider found:', !!slider);
    console.log('frequencySelect found:', !!frequencySelect);
    
    if (!frequencySelect) {
        console.error('❌ CRITICAL: donation-frequency element not found!');
        alert('ERROR: Frequency selector not found! Check console.');
        return;
    }
    
    const updateCalculator = () => updateDonationCalculator(school, targetFund);
    
    slider.addEventListener('input', updateCalculator);
    slider.addEventListener('change', updateCalculator);
    frequencySelect.addEventListener('change', updateCalculator);

    updateDonationCalculator(school, targetFund);
    navigateTo('school-detail-view');
}

// DONATION CALCULATOR LOGIC
function updateDonationCalculator(school, targetFund) {
    const slider = document.getElementById('donation-slider');
    const frequencySelect = document.getElementById('donation-frequency');
    const sliderLabel = document.getElementById('donation-slider-label');
    
    const donationAmount = parseInt(slider.value);
    const frequency = frequencySelect.value;
    
    // Update UI labels based on frequency
    const frequencyLabels = {
        'once': 'Ihre einmalige Spende:',
        'monthly': 'Ihre monatliche Spende:',
        'yearly': 'Ihre jährliche Spende:'
    };
    
    sliderLabel.textContent = frequencyLabels[frequency];
    
    const donationAmountElement = document.querySelector('.donation-amount');
    donationAmountElement.textContent = formatCurrency(donationAmount);

    // Convert donation to annual equivalent
    let annualDonation = 0;
    let oneTimeDonation = 0;
    
    switch(frequency) {
        case 'once':
            oneTimeDonation = donationAmount;
            annualDonation = 0; // No recurring donation
            break;
        case 'monthly':
            annualDonation = donationAmount * 12;
            break;
        case 'yearly':
            annualDonation = donationAmount;
            break;
    }

    // Scenario 1: Growth WITH donations (precise float calculation)
    let yearsWithHelp = 0;
    let currentFundWithHelp = school.fund + oneTimeDonation; // Add one-time donation immediately
    
    while (currentFundWithHelp < targetFund) {
        // Add annual donation and growth
        currentFundWithHelp = (currentFundWithHelp + annualDonation) * (1 + config.netGrowthRate);
        yearsWithHelp += 1; // Increment by 1 year
        
        if (yearsWithHelp > 500) { // Safety break at 500 years
            yearsWithHelp = "500+";
            break;
        }
    }

    // Scenario 2: Growth WITHOUT donations (baseline)
    let yearsWithoutHelp = "∞";
    if (school.fund > 0 && config.netGrowthRate > 0) {
        // Formula: n = ln(FV/PV) / ln(1+i) - precise float result
        const years = Math.log(targetFund / school.fund) / Math.log(1 + config.netGrowthRate);
        yearsWithoutHelp = years; // Keep as float for precision
    }
   
    // Calculate Time Saved in float years
    let yearsSaved = 0;
    if (isFinite(yearsWithoutHelp) && isFinite(yearsWithHelp)) {
        yearsSaved = yearsWithoutHelp - yearsWithHelp;
    }

    // Format time displays (convert float years to precise time periods)
    const timeWithoutHelp = formatTimePeriodFromYears(yearsWithoutHelp);
    const timeWithHelp = formatTimePeriodFromYears(yearsWithHelp);
    const timeSaved = formatTimePeriodFromYears(yearsSaved);

    // Update UI with error checking
    const elementsToUpdate = [
        { id: 'years-without-help', value: timeWithoutHelp },
        { id: 'years-with-help', value: timeWithHelp },
        { id: 'time-saved', value: timeSaved }
    ];

    elementsToUpdate.forEach(item => {
        const element = document.getElementById(item.id);
        if (element) {
            element.textContent = item.value;
        }
    });
}

// FORMAT TIME PERIOD (float years to precise years/months/days)
function formatTimePeriodFromYears(floatYears) {
    if (floatYears === "∞" || floatYears === "500+") {
        return floatYears === "500+" ? "500+ Jahre" : "∞";
    }
    
    if (!isFinite(floatYears) || floatYears <= 0) {
        return "Sofort erreicht!";
    }
    
    // Extract whole years
    const wholeYears = Math.floor(floatYears);
    const yearFraction = floatYears - wholeYears;
    
    // Convert year fraction to months (more precise than days-based calculation)
    const totalMonths = yearFraction * 12;
    const wholeMonths = Math.floor(totalMonths);
    const monthFraction = totalMonths - wholeMonths;
    
    // Convert month fraction to days (average month = 30.44 days)
    const wholeDays = Math.round(monthFraction * 30.44);
    
    const parts = [];
    
    if (wholeYears > 0) {
        parts.push(`${wholeYears} Jahr${wholeYears !== 1 ? 'e' : ''}`);
    }
    
    if (wholeMonths > 0) {
        parts.push(`${wholeMonths} Monat${wholeMonths !== 1 ? 'e' : ''}`);
    }
    
    if (wholeDays > 0 || parts.length === 0) {
        parts.push(`${wholeDays} Tag${wholeDays !== 1 ? 'e' : ''}`);
    }
    
    // Return most significant unit(s)
    if (parts.length === 1) {
        return parts[0];
    } else if (parts.length === 2) {
        return parts.join(' und ');
    } else {
        return `${parts[0]} und ${parts[1]}`;
    }
}

// LEGACY: Keep old function for backward compatibility if needed
function formatTimePeriod(days) {
    // Convert days to years and use new function
    if (days === "∞" || days === "500+ Jahre") {
        return days;
    }
    if (!isFinite(days) || days <= 0) {
        return "Sofort erreicht!";
    }
    return formatTimePeriodFromYears(days / 365.25); // More accurate year conversion
}

// DONATION HANDLER
function handleDonation() {
    // In a real app, this would integrate with payment processor
    alert('Danke für Ihre Spende! (Demo)\n\nIn der echten Version würden Sie zur sicheren Zahlungsabwicklung weitergeleitet.');
}

// UTILITY FUNCTIONS
function formatCurrency(num) {
    return new Intl.NumberFormat('de-DE', { 
        style: 'currency', 
        currency: 'EUR', 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 0 
    }).format(num);
}

// LOADING STATE MANAGEMENT
function showLoading(element) {
    if (element) {
        element.classList.add('loading');
    }
}

function hideLoading(element) {
    if (element) {
        element.classList.remove('loading');
    }
}

// ERROR HANDLING
function handleError(error, context = '') {
    console.error(`Error in ${context}:`, error);
    
    // Show user-friendly error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        background: #ff6b6b;
        color: white;
        padding: 15px;
        border-radius: 5px;
        margin: 20px auto;
        max-width: 600px;
        text-align: center;
    `;
    errorDiv.textContent = 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.';
    
    document.body.insertBefore(errorDiv, document.body.firstChild);
    
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);
}

// INITIALIZATION
function init() {
    try {
        // Check if required elements exist
        const requiredElements = ['school-list'];
        for (const id of requiredElements) {
            if (!document.getElementById(id)) {
                console.warn(`Required element #${id} not found`);
            }
        }

        // Initialize components
        populateSchoolList();
        
        // Handle initial URL hash
        const hash = window.location.hash.slice(1);
        if (hash && document.getElementById(hash)) {
            navigateTo(hash);
            
            // Special handling for school-detail-view on page load
            if (hash === 'school-detail-view') {
                const firstSchool = schoolsData[0];
                if (firstSchool) {
                    console.log('🚀 Auto-loading school on page load:', firstSchool.name);
                    showSchoolDetail(firstSchool.id);
                }
            }
        } else {
            navigateTo('home');
        }
        
        console.log('🚀 Deutsche Bildungsstiftung App initialized successfully - V3.2.1 CACHE-BUST FIX');
        
        // FORCE LOAD SCHOOL IF ON DETAIL PAGE  
        setTimeout(() => {
            const currentHash = window.location.hash.slice(1);
            console.log('🔍 FORCE CHECK - Current hash:', currentHash);
            
            if (currentHash === 'school-detail-view') {
                console.log('🚨 DETECTED: Direct navigation to school detail - FORCING LOAD');
                const firstSchool = schoolsData[0];
                if (firstSchool) {
                    console.log('🔄 FORCING reload of school:', firstSchool.name);
                    showSchoolDetail(firstSchool.id);
                }
            }
        }, 100);
        
        // Immediate diagnosis for debugging
        setTimeout(() => {
            const currentHash = window.location.hash.slice(1);
            console.log('🔍 Current hash after init:', currentHash);
            
            if (currentHash === 'school-detail-view') {
                const detailContainer = document.getElementById('school-detail-view-container');
                const frequencySelect = document.getElementById('donation-frequency');
                
                console.log('DetailContainer found:', !!detailContainer);
                console.log('DetailContainer content length:', detailContainer ? detailContainer.innerHTML.length : 0);
                console.log('FrequencySelect found:', !!frequencySelect);
                
                if (!frequencySelect && detailContainer) {
                    console.warn('🚨 Missing frequency selector - forcing reload of school detail');
                    const firstSchool = schoolsData[0];
                    if (firstSchool) {
                        showSchoolDetail(firstSchool.id);
                    }
                }
            }
        }, 500);
        
        
    } catch (error) {
        handleError(error, 'initialization');
    }
}

// START THE APP
document.addEventListener('DOMContentLoaded', init);

// Service Worker Registration (if available)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(() => console.log('Service Worker registered'))
            .catch(() => console.log('Service Worker registration failed'));
    });
} 
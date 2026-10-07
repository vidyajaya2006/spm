"use strict";

/* =========================================================
   PET — PERSONAL EXPENSE TRACKER
   Complete Dashboard JavaScript
   ========================================================= */


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let currentUser = null;

let transactions = [];

let budgets = [];

let goals = [];

let currentSection = "dashboard";

let currentPage = 1;

const ITEMS_PER_PAGE = 8;

let expenseChart = null;

let monthlyChart = null;

let categoryChart = null;

let balanceMiniChart = null;


/* =========================================================
   DOM HELPERS
   ========================================================= */

function $(id) {
    return document.getElementById(id);
}


function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   API HELPER
   ========================================================= */

async function api(
    url,
    options = {}
) {

    const config = {
        credentials: "same-origin",

        ...options,

        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    };


    const response =
        await fetch(
            url,
            config
        );


    let data = {};

    try {

        data =
            await response.json();

    } catch {

        data = {};
    }


    if (!response.ok) {

        const message =
            data.error ||
            data.message ||
            `Request failed (${response.status})`;

        throw new Error(
            message
        );
    }


    return data;
}


/* =========================================================
   NOTIFICATIONS
   ========================================================= */

function showNotification(
    message,
    type = "success"
) {

    const container =
        $("notificationContainer");


    if (!container) {

        alert(message);

        return;
    }


    const notification =
        document.createElement(
            "div"
        );


    notification.className =
        `notification ${type}`;


    notification.textContent =
        message;


    container.appendChild(
        notification
    );


    setTimeout(
        () => {

            notification.style.opacity =
                "0";

            notification.style.transform =
                "translateY(10px)";

            notification.style.transition =
                "0.25s";


            setTimeout(
                () => {

                    notification.remove();

                },
                250
            );

        },
        3000
    );
}


/* =========================================================
   FORMATTERS
   ========================================================= */

function formatCurrency(
    value
) {

    const number =
        Number(value) || 0;


    return new Intl.NumberFormat(
        "en-IN",
        {
            style:
                "currency",

            currency:
                "INR",

            maximumFractionDigits:
                2
        }
    ).format(
        number
    );
}


function formatNumber(
    value
) {

    return new Intl.NumberFormat(
        "en-IN"
    ).format(
        Number(value) || 0
    );
}


function formatDate(
    value
) {

    if (!value) {

        return "—";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return value;
    }


    return date.toLocaleDateString(
        "en-IN",
        {
            day:
                "2-digit",

            month:
                "short",

            year:
                "numeric"
        }
    );
}


function getInitials(
    name
) {

    const text =
        String(
            name || "User"
        )
            .trim();


    if (!text) {

        return "U";
    }


    const parts =
        text.split(
            /\s+/
        );


    if (
        parts.length === 1
    ) {

        return parts[0]
            .slice(
                0,
                2
            )
            .toUpperCase();
    }


    return (
        parts[0][0] +
        parts[
            parts.length - 1
        ][0]
    ).toUpperCase();
}


/* =========================================================
   AUTHENTICATION
   ========================================================= */

async function loadCurrentUser() {

    try {

        const data =
            await api(
                "/api/auth/me",
                {
                    method:
                        "GET"
                }
            );


        if (
            data &&
            data.authenticated &&
            data.user
        ) {

            currentUser =
                data.user;


            updateUserUI();


            return true;
        }


        currentUser =
            null;


        window.location.href =
            "/login.html";


        return false;

    } catch (error) {

        console.error(
            "Authentication error:",
            error
        );


        window.location.href =
            "/login.html";


        return false;
    }
}


function updateUserUI() {

    if (!currentUser) {

        return;
    }


    const name =
        currentUser.name ||
        "User";


    const email =
        currentUser.email ||
        "";


    const sidebarName =
        $("sidebarUserName");


    if (sidebarName) {

        sidebarName.textContent =
            name;
    }


    const sidebarEmail =
        $("sidebarUserEmail");


    if (sidebarEmail) {

        sidebarEmail.textContent =
            email;
    }


    const sidebarAvatar =
        $("sidebarAvatar");


    if (sidebarAvatar) {

        sidebarAvatar.textContent =
            getInitials(
                name
            );
    }


    const profileName =
        $("profileName");


    if (profileName) {

        profileName.textContent =
            name;
    }


    const profileEmail =
        $("profileEmail");


    if (profileEmail) {

        profileEmail.textContent =
            email;
    }


    const profileAvatar =
        $("profileAvatar");


    if (profileAvatar) {

        profileAvatar.textContent =
            getInitials(
                name
            );
    }


    const profileNameInput =
        $("profileNameInput");


    if (profileNameInput) {

        profileNameInput.value =
            name;
    }


    const profileEmailInput =
        $("profileEmailInput");


    if (profileEmailInput) {

        profileEmailInput.value =
            email;
    }
}


async function logoutPET() {

    try {

        await api(
            "/api/auth/logout",
            {
                method:
                    "POST"
            }
        );

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

    } finally {

        window.location.href =
            "/login.html";
    }
}


window.logoutPET =
    logoutPET;


/* =========================================================
   TRANSACTIONS
   ========================================================= */

function normalizeTransaction(
    transaction
) {

    return {

        id:
            transaction.id,

        description:
            transaction.description ||
            "Transaction",

        amount:
            Number(
                transaction.amount
            ) || 0,

        type:
            String(
                transaction.type ||
                "expense"
            ).toLowerCase(),

        category:
            transaction.category ||
            "Other",

        date:
            transaction.date ||
            "",

        payment_method:
            transaction.payment_method ||
            "Other",

        notes:
            transaction.notes ||
            "",

        created_at:
            transaction.created_at ||
            ""
    };
}


async function loadTransactions() {

    try {

        const data =
            await api(
                "/transactions",
                {
                    method:
                        "GET"
                }
            );


        transactions =
            Array.isArray(
                data.transactions
            )
                ? data.transactions.map(
                    normalizeTransaction
                )
                : [];


        updateCategoryFilter();

        renderTransactions();

        renderRecentTransactions();

        renderDashboardSummary();

        renderAnalytics();

        renderExpenseChart();

        renderMonthlyChart();

        renderCategoryChart();

        renderInsights();

        renderBalanceMiniChart();

    } catch (error) {

        console.error(
            "Transaction loading error:",
            error
        );


        showNotification(
            error.message ||
            "Could not load transactions.",
            "error"
        );
    }
}


/* =========================================================
   SUMMARY
   ========================================================= */

function calculateSummary() {

    let income = 0;

    let expense = 0;


    transactions.forEach(
        transaction => {

            if (
                transaction.type ===
                "income"
            ) {

                income +=
                    transaction.amount;

            } else if (
                transaction.type ===
                "expense"
            ) {

                expense +=
                    transaction.amount;
            }
        }
    );


    const balance =
        income - expense;


    const savingsRate =
        income > 0
            ? (
                balance /
                income
            ) * 100
            : 0;


    return {

        income,

        expense,

        balance,

        savingsRate
    };
}


function renderDashboardSummary() {

    const summary =
        calculateSummary();


    const balance =
        $("balanceAmount");


    if (balance) {

        balance.textContent =
            formatCurrency(
                summary.balance
            );
    }


    const income =
        $("incomeAmount");


    if (income) {

        income.textContent =
            formatCurrency(
                summary.income
            );
    }


    const expense =
        $("expenseAmount");


    if (expense) {

        expense.textContent =
            formatCurrency(
                summary.expense
            );
    }


    const savings =
        $("savingsRate");


    if (savings) {

        savings.textContent =
            `${Math.round(
                summary.savingsRate
            )}%`;
    }


    const count =
        $("transactionCount");


    if (count) {

        count.textContent =
            formatNumber(
                transactions.length
            );
    }


    renderFinancialHealth(
        summary
    );
}


function renderFinancialHealth(
    summary
) {

    let score = 50;


    if (summary.income > 0) {

        const ratio =
            summary.balance /
            summary.income;


        score =
            Math.round(
                Math.max(
                    0,
                    Math.min(
                        100,
                        50 +
                        ratio * 50
                    )
                )
            );
    }


    if (
        summary.expense === 0
    ) {

        score = 80;
    }


    const scoreElement =
        $("healthScore");


    if (scoreElement) {

        scoreElement.textContent =
            score;
    }


    const label =
        $("healthLabel");


    const savings =
        $("healthSavings");


    let text =
        "Keep building your savings.";


    let status =
        "Good";


    if (score >= 80) {

        status =
            "Excellent";


        text =
            "Your savings pattern looks strong.";

    } else if (score >= 60) {

        status =
            "Good";


        text =
            "You're maintaining a healthy balance.";

    } else if (score >= 40) {

        status =
            "Watch";


        text =
            "Try reducing unnecessary spending.";

    } else {

        status =
            "Needs attention";


        text =
            "Your expenses are currently high.";
    }


    if (label) {

        label.textContent =
            status;
    }


    if (savings) {

        savings.textContent =
            text;
    }


    const circle =
        document.querySelector(
            ".score-circle"
        );


    if (circle) {

        const degrees =
            Math.round(
                score * 3.6
            );


        circle.style.background =
            `conic-gradient(
                var(--secondary)
                0deg,
                var(--secondary)
                ${degrees}deg,
                #e9ecf2
                ${degrees}deg,
                #e9ecf2
                360deg
            )`;
    }
}


/* =========================================================
   TRANSACTION TABLE
   ========================================================= */

function getFilteredTransactions() {

    let result =
        [
            ...transactions
        ];


    const search =
        (
            $("searchInput")?.value ||
            ""
        )
            .trim()
            .toLowerCase();


    const type =
        $("typeFilter")?.value ||
        "all";


    const category =
        $("categoryFilter")?.value ||
        "all";


    const sort =
        $("sortFilter")?.value ||
        "newest";


    if (search) {

        result =
            result.filter(
                transaction => {

                    return (
                        transaction.description
                            .toLowerCase()
                            .includes(search) ||

                        transaction.category
                            .toLowerCase()
                            .includes(search) ||

                        transaction.payment_method
                            .toLowerCase()
                            .includes(search)
                    );
                }
            );
    }


    if (type !== "all") {

        result =
            result.filter(
                transaction =>
                    transaction.type ===
                    type
            );
    }


    if (category !== "all") {

        result =
            result.filter(
                transaction =>
                    transaction.category ===
                    category
            );
    }


    result.sort(
        (a, b) => {

            if (
                sort === "highest"
            ) {

                return b.amount -
                    a.amount;
            }


            if (
                sort === "lowest"
            ) {

                return a.amount -
                    b.amount;
            }


            const dateA =
                new Date(
                    a.date ||
                    a.created_at ||
                    0
                ).getTime();


            const dateB =
                new Date(
                    b.date ||
                    b.created_at ||
                    0
                ).getTime();


            if (
                sort === "oldest"
            ) {

                return dateA -
                    dateB;
            }


            return dateB -
                dateA;
        }
    );


    return result;
}


function renderTransactions() {

    const container =
        $("transactionList");


    if (!container) {

        return;
    }


    const filtered =
        getFilteredTransactions();


    const totalPages =
        Math.max(
            1,
            Math.ceil(
                filtered.length /
                ITEMS_PER_PAGE
            )
        );


    if (
        currentPage >
        totalPages
    ) {

        currentPage =
            totalPages;
    }


    const start =
        (
            currentPage -
            1
        ) *
        ITEMS_PER_PAGE;


    const pageItems =
        filtered.slice(
            start,
            start +
            ITEMS_PER_PAGE
        );


    if (
        pageItems.length === 0
    ) {

        container.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        No transactions found.
                    </div>
                </td>
            </tr>
        `;


        renderPagination(
            0
        );


        return;
    }


    container.innerHTML =
        pageItems.map(
            transaction => {

                const amountClass =
                    transaction.type ===
                    "income"
                        ? "amount-income"
                        : "amount-expense";


                const sign =
                    transaction.type ===
                    "income"
                        ? "+"
                        : "-";


                return `
                    <tr>

                        <td>
                            <div class="transaction-name">
                                ${escapeHTML(
                                    transaction.description
                                )}
                            </div>

                            <div class="transaction-category">
                                ${escapeHTML(
                                    transaction.notes ||
                                    ""
                                )}
                            </div>
                        </td>

                        <td>
                            ${escapeHTML(
                                transaction.category
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                transaction.payment_method
                            )}
                        </td>

                        <td>
                            ${formatDate(
                                transaction.date
                            )}
                        </td>

                        <td class="${amountClass}">
                            ${sign}
                            ${formatCurrency(
                                transaction.amount
                            )}
                        </td>

                        <td>
                            <button
                                class="delete-button"
                                onclick="deleteTransaction(${transaction.id})"
                                title="Delete"
                            >
                                ×
                            </button>
                        </td>

                    </tr>
                `;
            }
        ).join("");


    renderPagination(
        totalPages
    );
}


function renderPagination(
    totalPages
) {

    const container =
        $("pagination");


    if (!container) {

        return;
    }


    if (
        totalPages <= 1
    ) {

        container.innerHTML =
            "";

        return;
    }


    let html = "";


    for (
        let page = 1;
        page <= totalPages;
        page++
    ) {

        html += `
            <button
                class="page-button ${
                    page === currentPage
                        ? "active"
                        : ""
                }"
                onclick="goToPage(${page})"
            >
                ${page}
            </button>
        `;
    }


    container.innerHTML =
        html;
}


function goToPage(
    page
) {

    currentPage =
        Number(page) || 1;


    renderTransactions();
}


window.goToPage =
    goToPage;


async function deleteTransaction(
    id
) {

    const confirmed =
        confirm(
            "Delete this transaction?"
        );


    if (!confirmed) {

        return;
    }


    try {

        await api(
            `/transactions/${id}`,
            {
                method:
                    "DELETE"
            }
        );


        showNotification(
            "Transaction deleted."
        );


        await loadTransactions();

    } catch (error) {

        showNotification(
            error.message ||
            "Could not delete transaction.",
            "error"
        );
    }
}


window.deleteTransaction =
    deleteTransaction;


/* =========================================================
   CATEGORY FILTER
   ========================================================= */

function updateCategoryFilter() {

    const select =
        $("categoryFilter");


    if (!select) {

        return;
    }


    const previous =
        select.value;


    const categories =
        [
            ...new Set(
                transactions
                    .map(
                        transaction =>
                            transaction.category
                    )
                    .filter(Boolean)
            )
        ]
            .sort();


    select.innerHTML = `
        <option value="all">
            All Categories
        </option>
    `;


    categories.forEach(
        category => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                category;


            option.textContent =
                category;


            select.appendChild(
                option
            );
        }
    );


    if (
        categories.includes(
            previous
        )
    ) {

        select.value =
            previous;
    }
}


/* =========================================================
   RECENT TRANSACTIONS
   ========================================================= */

function renderRecentTransactions() {

    const container =
        $("recentTransactions");


    if (!container) {

        return;
    }


    const recent =
        [
            ...transactions
        ]
            .sort(
                (a, b) => {

                    const dateA =
                        new Date(
                            a.date ||
                            a.created_at ||
                            0
                        );


                    const dateB =
                        new Date(
                            b.date ||
                            b.created_at ||
                            0
                        );


                    return dateB -
                        dateA;
                }
            )
            .slice(
                0,
                5
            );


    if (
        recent.length === 0
    ) {

        container.innerHTML = `
            <tr>
                <td colspan="3">
                    <div class="empty-state">
                        No transactions yet.
                    </div>
                </td>
            </tr>
        `;


        return;
    }


    container.innerHTML =
        recent.map(
            transaction => {

                const income =
                    transaction.type ===
                    "income";


                return `
                    <tr>

                        <td>
                            <div class="transaction-name">
                                ${escapeHTML(
                                    transaction.description
                                )}
                            </div>

                            <div class="transaction-category">
                                ${escapeHTML(
                                    transaction.category
                                )}
                            </div>
                        </td>

                        <td>
                            ${formatDate(
                                transaction.date
                            )}
                        </td>

                        <td class="${
                            income
                                ? "amount-income"
                                : "amount-expense"
                        }">
                            ${
                                income
                                    ? "+"
                                    : "-"
                            }
                            ${formatCurrency(
                                transaction.amount
                            )}
                        </td>

                    </tr>
                `;
            }
        ).join("");
}


/* =========================================================
   TRANSACTION MODAL
   ========================================================= */

function openTransactionModal() {

    const modal =
        $("transactionModal");


    if (!modal) {

        return;
    }


    modal.classList.add(
        "show"
    );


    const form =
        $("transactionForm");


    if (form) {

        form.reset();
    }


    const date =
        $("transactionDate");


    if (date) {

        date.value =
            new Date()
                .toISOString()
                .split("T")[0];
    }
}


function closeTransactionModal() {

    const modal =
        $("transactionModal");


    if (modal) {

        modal.classList.remove(
            "show"
        );
    }
}


async function saveTransaction(
    event
) {

    event.preventDefault();


    const description =
        $("description")?.value
            .trim();


    const amount =
        $("amount")?.value;


    const type =
        $("type")?.value;


    const category =
        $("category")?.value
            .trim() ||
        "Other";


    const paymentMethod =
        $("paymentMethod")?.value
            .trim() ||
        "Other";


    const date =
        $("transactionDate")?.value;


    const notes =
        $("notes")?.value
            .trim() ||
        "";


    if (!description) {

        showNotification(
            "Please enter a description.",
            "error"
        );


        return;
    }


    if (!amount) {

        showNotification(
            "Please enter an amount.",
            "error"
        );


        return;
    }


    if (
        type !== "income" &&
        type !== "expense"
    ) {

        showNotification(
            "Please select Income or Expense.",
            "error"
        );


        return;
    }


    if (!date) {

        showNotification(
            "Please select a date.",
            "error"
        );


        return;
    }


    const saveButton =
        $("saveTransactionBtn");


    if (saveButton) {

        saveButton.disabled =
            true;


        saveButton.textContent =
            "Saving...";
    }


    try {

        await api(
            "/transactions",
            {
                method:
                    "POST",

                body:
                    JSON.stringify({
                        description,

                        amount:
                            Number(
                                amount
                            ),

                        type,

                        category,

                        payment_method:
                            paymentMethod,

                        date,

                        notes
                    })
            }
        );


        showNotification(
            "Transaction saved successfully."
        );


        closeTransactionModal();


        await loadTransactions();

    } catch (error) {

        showNotification(
            error.message ||
            "Could not save transaction.",
            "error"
        );

    } finally {

        if (saveButton) {

            saveButton.disabled =
                false;


            saveButton.textContent =
                "Save Transaction";
        }
    }
}


/* =========================================================
   BUDGETS
   ========================================================= */

async function loadBudgets() {

    try {

        const data =
            await api(
                "/budgets",
                {
                    method:
                        "GET"
                }
            );


        budgets =
            Array.isArray(
                data.budgets
            )
                ? data.budgets
                : [];


        renderBudgets();

        renderDashboardBudgets();

    } catch (error) {

        console.error(
            "Budget loading error:",
            error
        );


        budgets = [];


        renderBudgets();

        renderDashboardBudgets();
    }
}


function getCurrentMonth() {

    const now =
        new Date();


    return (
        now.getFullYear() +
        "-" +
        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        )
    );
}


function calculateBudgetSpent(
    budget
) {

    const targetMonth =
        String(
            budget.month ||
            ""
        );


    return transactions
        .filter(
            transaction => {

                if (
                    transaction.type !==
                    "expense"
                ) {

                    return false;
                }


                if (
                    transaction.category !==
                    budget.category
                ) {

                    return false;
                }


                if (
                    !transaction.date
                ) {

                    return false;
                }


                return transaction.date
                    .startsWith(
                        targetMonth
                    );
            }
        )
        .reduce(
            (
                total,
                transaction
            ) => {

                return total +
                    transaction.amount;

            },
            0
        );
}


function renderBudgets() {

    const container =
        $("budgetPageList");


    if (!container) {

        return;
    }


    if (
        budgets.length === 0
    ) {

        container.innerHTML = `
            <div class="empty-state">
                No budgets created yet.
                <br>
                Click
                <strong>+ Create Budget</strong>
                to create your first budget.
            </div>
        `;


        return;
    }


    container.innerHTML =
        budgets.map(
            budget => {

                const amount =
                    Number(
                        budget.amount
                    ) || 0;


                const spent =
                    calculateBudgetSpent(
                        budget
                    );


                const percentage =
                    amount > 0
                        ? Math.min(
                            100,
                            (
                                spent /
                                amount
                            ) * 100
                        )
                        : 0;


                const remaining =
                    amount -
                    spent;


                let progressColor =
                    "var(--primary)";


                if (
                    percentage >= 90
                ) {

                    progressColor =
                        "var(--danger)";

                } else if (
                    percentage >= 70
                ) {

                    progressColor =
                        "var(--warning)";
                }


                return `
                    <div
                        class="budget-item"
                        style="
                            padding:20px 4px;
                        "
                    >

                        <div
                            class="budget-row"
                            style="
                                align-items:center;
                            "
                        >

                            <div>

                                <div
                                    class="budget-name"
                                    style="
                                        font-size:13px;
                                    "
                                >
                                    ${escapeHTML(
                                        budget.category
                                    )}
                                </div>

                                <div
                                    style="
                                        color:var(--muted);
                                        font-size:9px;
                                        margin-top:4px;
                                    "
                                >
                                    ${escapeHTML(
                                        budget.month
                                    )}
                                </div>

                            </div>


                            <button
                                class="delete-button"
                                onclick="deleteBudget(${budget.id})"
                                title="Delete budget"
                            >
                                ×
                            </button>

                        </div>


                        <div
                            style="
                                display:flex;
                                justify-content:space-between;
                                align-items:center;
                                margin-top:14px;
                            "
                        >

                            <div>

                                <strong>
                                    ${formatCurrency(
                                        spent
                                    )}
                                </strong>

                                <span
                                    style="
                                        color:var(--muted);
                                        font-size:10px;
                                    "
                                >
                                    spent
                                </span>

                            </div>


                            <div
                                style="
                                    color:var(--muted);
                                    font-size:10px;
                                "
                            >
                                Budget:
                                ${formatCurrency(
                                    amount
                                )}
                            </div>

                        </div>


                        <div
                            class="budget-progress"
                            style="
                                margin-top:10px;
                            "
                        >

                            <span
                                style="
                                    width:${percentage}%;
                                    background:${progressColor};
                                "
                            ></span>

                        </div>


                        <div
                            style="
                                display:flex;
                                justify-content:space-between;
                                margin-top:7px;
                                font-size:9px;
                                color:var(--muted);
                            "
                        >

                            <span>
                                ${Math.round(
                                    percentage
                                )}% used
                            </span>

                            <span>
                                ${
                                    remaining >= 0
                                        ? `${formatCurrency(
                                            remaining
                                        )} remaining`
                                        : `${formatCurrency(
                                            Math.abs(
                                                remaining
                                            )
                                        )} over`
                                }
                            </span>

                        </div>

                    </div>
                `;
            }
        ).join("");
}


function renderDashboardBudgets() {

    const container =
        $("dashboardBudgets");


    if (!container) {

        return;
    }


    const currentMonth =
        getCurrentMonth();


    const currentBudgets =
        budgets.filter(
            budget =>
                budget.month ===
                currentMonth
        );


    if (
        currentBudgets.length === 0
    ) {

        container.innerHTML = `
            <div class="empty-state">
                No budgets for this month.
            </div>
        `;


        return;
    }


    container.innerHTML =
        currentBudgets
            .slice(
                0,
                5
            )
            .map(
                budget => {

                    const amount =
                        Number(
                            budget.amount
                        ) || 0;


                    const spent =
                        calculateBudgetSpent(
                            budget
                        );


                    const percentage =
                        amount > 0
                            ? Math.min(
                                100,
                                (
                                    spent /
                                    amount
                                ) * 100
                            )
                            : 0;


                    return `
                        <div class="budget-item">

                            <div class="budget-row">

                                <span class="budget-name">
                                    ${escapeHTML(
                                        budget.category
                                    )}
                                </span>

                                <span class="budget-value">
                                    ${formatCurrency(
                                        spent
                                    )}
                                    /
                                    ${formatCurrency(
                                        amount
                                    )}
                                </span>

                            </div>

                            <div class="budget-progress">

                                <span
                                    style="
                                        width:${percentage}%;
                                    "
                                ></span>

                            </div>

                        </div>
                    `;
                }
            ).join("");
}
        



function renderPagination(
    totalPages
) {

    const container =
        $("pagination");

    if (!container) {
        return;
    }


    if (
        totalPages <= 1
    ) {

        container.innerHTML =
            "";

        return;
    }


    let html = "";


    for (
        let page = 1;
        page <= totalPages;
        page++
    ) {

        html += `
            <button
                class="page-button ${
                    page === currentPage
                        ? "active"
                        : ""
                }"
                onclick="goToPage(${page})"
            >
                ${page}
            </button>
        `;
    }


    container.innerHTML =
        html;
}


function goToPage(
    page
) {

    currentPage =
        Number(page) || 1;

    renderTransactions();
}


window.goToPage =
    goToPage;


async function deleteTransaction(
    id
) {

    const confirmed =
        confirm(
            "Delete this transaction?"
        );

    if (!confirmed) {
        return;
    }


    try {

        await api(
            `/transactions/${id}`,
            {
                method: "DELETE"
            }
        );

        showNotification(
            "Transaction deleted."
        );

        await loadTransactions();

    } catch (error) {

        showNotification(
            error.message ||
            "Could not delete transaction.",
            "error"
        );
    }
}


window.deleteTransaction =
    deleteTransaction;


/* =========================================================
   CATEGORY FILTER
   ========================================================= */

function updateCategoryFilter() {

    const select =
        $("categoryFilter");

    if (!select) {
        return;
    }


    const previous =
        select.value;


    const categories =
        [
            ...new Set(
                transactions
                    .map(
                        transaction =>
                            transaction.category
                    )
                    .filter(Boolean)
            )
        ]
        .sort();


    select.innerHTML = `
        <option value="all">
            All Categories
        </option>
    `;


    categories.forEach(
        category => {

            const option =
                document.createElement(
                    "option"
                );

            option.value =
                category;

            option.textContent =
                category;

            select.appendChild(
                option
            );
        }
    );


    if (
        categories.includes(previous)
    ) {

        select.value =
            previous;
    }
}


/* =========================================================
   RECENT TRANSACTIONS
   ========================================================= */

function renderRecentTransactions() {

    const container =
        $("recentTransactions");

    if (!container) {
        return;
    }


    const recent =
        [...transactions]
            .sort(
                (a, b) => {

                    const dateA =
                        new Date(
                            a.date ||
                            a.created_at ||
                            0
                        );

                    const dateB =
                        new Date(
                            b.date ||
                            b.created_at ||
                            0
                        );

                    return dateB - dateA;
                }
            )
            .slice(
                0,
                5
            );


    if (recent.length === 0) {

        container.innerHTML = `
            <tr>
                <td colspan="3">
                    <div class="empty-state">
                        No transactions yet.
                    </div>
                </td>
            </tr>
        `;

        return;
    }


    container.innerHTML =
        recent.map(
            transaction => {

                const income =
                    transaction.type ===
                    "income";

                return `
                    <tr>

                        <td>
                            <div class="transaction-name">
                                ${escapeHTML(
                                    transaction.description
                                )}
                            </div>

                            <div class="transaction-category">
                                ${escapeHTML(
                                    transaction.category
                                )}
                            </div>
                        </td>

                        <td>
                            ${formatDate(
                                transaction.date
                            )}
                        </td>

                        <td class="${
                            income
                                ? "amount-income"
                                : "amount-expense"
                        }">
                            ${
                                income
                                    ? "+"
                                    : "-"
                            }
                            ${formatCurrency(
                                transaction.amount
                            )}
                        </td>

                    </tr>
                `;
            }
        ).join("");
}


/* =========================================================
   TRANSACTION MODAL
   ========================================================= */

function openTransactionModal() {

    const modal =
        $("transactionModal");

    if (!modal) {
        return;
    }

    modal.classList.add(
        "show"
    );


    const form =
        $("transactionForm");

    if (form) {
        form.reset();
    }


    const date =
        $("transactionDate");

    if (date) {

        date.value =
            new Date()
                .toISOString()
                .split("T")[0];
    }
}


function closeTransactionModal() {

    const modal =
        $("transactionModal");

    if (modal) {

        modal.classList.remove(
            "show"
        );
    }
}


async function saveTransaction(
    event
) {

    event.preventDefault();


    const description =
        $("description")?.value
            .trim();


    const amount =
        $("amount")?.value;


    const type =
        $("type")?.value;


    const category =
        $("category")?.value
            .trim() ||
        "Other";


    const paymentMethod =
        $("paymentMethod")?.value
            .trim() ||
        "Other";


    const date =
        $("transactionDate")?.value;


    const notes =
        $("notes")?.value
            .trim() ||
        "";


    if (!description) {

        showNotification(
            "Please enter a description.",
            "error"
        );

        return;
    }


    if (!amount) {

        showNotification(
            "Please enter an amount.",
            "error"
        );

        return;
    }


    if (
        type !== "income" &&
        type !== "expense"
    ) {

        showNotification(
            "Please select Income or Expense.",
            "error"
        );

        return;
    }


    if (!date) {

        showNotification(
            "Please select a date.",
            "error"
        );

        return;
    }


    const saveButton =
        $("saveTransactionBtn");


    if (saveButton) {

        saveButton.disabled =
            true;

        saveButton.textContent =
            "Saving...";
    }


    try {

        await api(
            "/transactions",
            {
                method: "POST",

                body: JSON.stringify({
                    description,
                    amount:
                        Number(amount),
                    type,
                    category,
                    payment_method:
                        paymentMethod,
                    date,
                    notes
                })
            }
        );


        showNotification(
            "Transaction saved successfully."
        );


        closeTransactionModal();

        await loadTransactions();


    } catch (error) {

        showNotification(
            error.message ||
            "Could not save transaction.",
            "error"
        );


    } finally {

        if (saveButton) {

            saveButton.disabled =
                false;

            saveButton.textContent =
                "Save Transaction";
        }
    }
}


/* =========================================================
   BUDGETS
   ========================================================= */

async function loadBudgets() {

    try {

        const data =
            await api(
                "/budgets",
                {
                    method: "GET"
                }
            );

        budgets =
            Array.isArray(
                data.budgets
            )
                ? data.budgets
                : [];


        renderBudgets();

        renderDashboardBudgets();

    } catch (error) {

        console.error(
            "Budget loading error:",
            error
        );

        budgets = [];

        renderBudgets();

        renderDashboardBudgets();
    }
}


function getCurrentMonth() {

    const now =
        new Date();

    return (
        now.getFullYear() +
        "-" +
        String(
            now.getMonth() + 1
        ).padStart(2, "0")
    );
}


function calculateBudgetSpent(
    budget
) {

    const targetMonth =
        String(
            budget.month || ""
        );


    return transactions
        .filter(
            transaction => {

                if (
                    transaction.type !==
                    "expense"
                ) {
                    return false;
                }


                if (
                    transaction.category !==
                    budget.category
                ) {
                    return false;
                }


                if (!transaction.date) {
                    return false;
                }


                return transaction.date
                    .startsWith(
                        targetMonth
                    );
            }
        )
        .reduce(
            (
                total,
                transaction
            ) => {

                return total +
                    Number(
                        transaction.amount
                    );

            },
            0
        );
}


function renderBudgets() {

    const container =
        $("budgetPageList");

    if (!container) {
        return;
    }


    if (budgets.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                No budgets created yet.
                <br>
                Click
                <strong>+ Create Budget</strong>
                to create your first budget.
            </div>
        `;

        return;
    }


    container.innerHTML =
        budgets.map(
            budget => {

                const amount =
                    Number(
                        budget.amount
                    ) || 0;


                const spent =
                    calculateBudgetSpent(
                        budget
                    );


                const percentage =
                    amount > 0
                        ? Math.min(
                            100,
                            (
                                spent /
                                amount
                            ) * 100
                        )
                        : 0;


                const remaining =
                    amount - spent;


                let progressColor =
                    "var(--primary)";


                if (
                    percentage >= 90
                ) {

                    progressColor =
                        "var(--danger)";

                } else if (
                    percentage >= 70
                ) {

                    progressColor =
                        "var(--warning)";
                }


                return `
                    <div
                        class="budget-item"
                        style="
                            padding: 20px 4px;
                        "
                    >

                        <div
                            class="budget-row"
                            style="
                                align-items:center;
                            "
                        >

                            <div>

                                <div
                                    class="budget-name"
                                    style="
                                        font-size:13px;
                                    "
                                >
                                    ${escapeHTML(
                                        budget.category
                                    )}
                                </div>

                                <div
                                    style="
                                        color:var(--muted);
                                        font-size:9px;
                                        margin-top:4px;
                                    "
                                >
                                    ${escapeHTML(
                                        budget.month
                                    )}
                                </div>

                            </div>


                            <button
                                class="delete-button"
                                onclick="deleteBudget(${budget.id})"
                                title="Delete budget"
                            >
                                ×
                            </button>

                        </div>


                        <div
                            style="
                                display:flex;
                                justify-content:space-between;
                                align-items:center;
                                margin-top:14px;
                            "
                        >

                            <div>

                                <strong>
                                    ${formatCurrency(
                                        spent
                                    )}
                                </strong>

                                <span
                                    style="
                                        color:var(--muted);
                                        font-size:10px;
                                    "
                                >
                                    spent
                                </span>

                            </div>


                            <div
                                style="
                                    color:var(--muted);
                                    font-size:10px;
                                "
                            >
                                Budget:
                                ${formatCurrency(
                                    amount
                                )}
                            </div>

                        </div>


                        <div
                            class="budget-progress"
                            style="margin-top:10px;"
                        >

                            <span
                                style="
                                    width:${percentage}%;
                                    background:${progressColor};
                                "
                            ></span>

                        </div>


                        <div
                            style="
                                display:flex;
                                justify-content:space-between;
                                margin-top:7px;
                                font-size:9px;
                                color:var(--muted);
                            "
                        >

                            <span>
                                ${Math.round(
                                    percentage
                                )}% used
                            </span>

                            <span>
                                ${
                                    remaining >= 0
                                        ? `${formatCurrency(
                                            remaining
                                        )} remaining`
                                        : `${formatCurrency(
                                            Math.abs(
                                                remaining
                                            )
                                        )} over`
                                }
                            </span>

                        </div>

                    </div>
                `;
            }
        ).join("");
}


function renderDashboardBudgets() {

    const container =
        $("dashboardBudgets");

    if (!container) {
        return;
    }


    const currentMonth =
        getCurrentMonth();


    const currentBudgets =
        budgets.filter(
            budget =>
                budget.month ===
                currentMonth
        );


    if (
        currentBudgets.length === 0
    ) {

        container.innerHTML = `
            <div class="empty-state">
                No budgets for this month.
            </div>
        `;

        return;
    }


    container.innerHTML =
        currentBudgets
            .slice(0, 5)
            .map(
                budget => {

                    const amount =
                        Number(
                            budget.amount
                        ) || 0;

                    const spent =
                        calculateBudgetSpent(
                            budget
                        );

                    const percentage =
                        amount > 0
                            ? Math.min(
                                100,
                                (
                                    spent /
                                    amount
                                ) * 100
                            )
                            : 0;


                    return `
                        <div class="budget-item">

                            <div class="budget-row">

                                <span class="budget-name">
                                    ${escapeHTML(
                                        budget.category
                                    )}
                                </span>

                                <span class="budget-value">
                                    ${formatCurrency(
                                        spent
                                    )}
                                    /
                                    ${formatCurrency(
                                        amount
                                    )}
                                </span>

                            </div>

                            <div class="budget-progress">

                                <span
                                    style="
                                        width:${percentage}%;
                                    "
                                ></span>

                            </div>

                        </div>
                    `;
                }
            ).join("");
}
/* =========================================================
   BUDGET MODAL
   ========================================================= */

function ensureBudgetModal() {

    if ($("budgetModal")) {
        return;
    }


    const modal =
        document.createElement(
            "div"
        );

    modal.className =
        "modal";

    modal.id =
        "budgetModal";


    modal.innerHTML = `
        <div class="modal-card">

            <div class="modal-header">

                <h3>
                    Create Budget
                </h3>

                <button
                    type="button"
                    class="close-button"
                    id="closeBudgetModal"
                >
                    ×
                </button>

            </div>


            <form id="budgetForm">

                <div class="form-grid">

                    <div class="form-group full">

                        <label class="form-label">
                            Category
                        </label>

                        <select
                            class="form-control"
                            id="budgetCategory"
                            required
                        >

                            <option value="">
                                Select category
                            </option>

                            <option value="Food">
                                Food
                            </option>

                            <option value="Transport">
                                Transport
                            </option>

                            <option value="Shopping">
                                Shopping
                            </option>

                            <option value="Bills">
                                Bills
                            </option>

                            <option value="Entertainment">
                                Entertainment
                            </option>

                            <option value="Health">
                                Health
                            </option>

                            <option value="Education">
                                Education
                            </option>

                            <option value="Rent">
                                Rent
                            </option>

                            <option value="Travel">
                                Travel
                            </option>

                            <option value="Other">
                                Other
                            </option>

                        </select>

                    </div>


                    <div class="form-group">

                        <label class="form-label">
                            Monthly Budget
                        </label>

                        <input
                            class="form-control"
                            id="budgetAmount"
                            type="number"
                            min="1"
                            step="0.01"
                            placeholder="₹ 10,000"
                            required
                        >

                    </div>


                    <div class="form-group">

                        <label class="form-label">
                            Month
                        </label>

                        <input
                            class="form-control"
                            id="budgetMonth"
                            type="month"
                            required
                        >

                    </div>

                </div>


                <div
                    style="
                        padding:12px 14px;
                        margin-top:2px;
                        margin-bottom:10px;
                        border-radius:10px;
                        background:rgba(108,99,255,0.08);
                        color:var(--muted);
                        font-size:10px;
                        line-height:1.5;
                    "
                >

                    PET will automatically compare
                    your expenses in this category
                    with your budget.

                </div>


                <div class="modal-actions">

                    <button
                        type="button"
                        class="secondary-button"
                        id="cancelBudgetBtn"
                    >
                        Cancel
                    </button>


                    <button
                        type="submit"
                        class="primary-button"
                        id="saveBudgetBtn"
                    >
                        Create Budget
                    </button>

                </div>

            </form>

        </div>
    `;


    document.body.appendChild(
        modal
    );


    $("closeBudgetModal")
        ?.addEventListener(
            "click",
            closeBudgetModal
        );


    $("cancelBudgetBtn")
        ?.addEventListener(
            "click",
            closeBudgetModal
        );


    modal.addEventListener(
        "click",
        event => {

            if (
                event.target === modal
            ) {

                closeBudgetModal();
            }
        }
    );


    $("budgetForm")
        ?.addEventListener(
            "submit",
            saveBudget
        );


    const month =
        $("budgetMonth");


    if (month) {

        month.value =
            getCurrentMonth();
    }
}


function openBudgetModal() {

    ensureBudgetModal();


    const modal =
        $("budgetModal");

    if (!modal) {
        return;
    }


    const form =
        $("budgetForm");

    if (form) {
        form.reset();
    }


    const month =
        $("budgetMonth");

    if (month) {

        month.value =
            getCurrentMonth();
    }


    modal.classList.add(
        "show"
    );
}


function closeBudgetModal() {

    const modal =
        $("budgetModal");

    if (modal) {

        modal.classList.remove(
            "show"
        );
    }
}


async function saveBudget(
    event
) {

    event.preventDefault();


    const category =
        $("budgetCategory")
            ?.value
            .trim();


    const amount =
        $("budgetAmount")
            ?.value;


    const month =
        $("budgetMonth")
            ?.value;


    if (!category) {

        showNotification(
            "Please select a category.",
            "error"
        );

        return;
    }


    if (
        !amount ||
        Number(amount) <= 0
    ) {

        showNotification(
            "Please enter a valid budget amount.",
            "error"
        );

        return;
    }


    if (!month) {

        showNotification(
            "Please select a month.",
            "error"
        );

        return;
    }


    const button =
        $("saveBudgetBtn");


    if (button) {

        button.disabled =
            true;

        button.textContent =
            "Creating...";
    }


    try {

        await api(
            "/budgets",
            {
                method: "POST",

                body: JSON.stringify({
                    category,

                    amount:
                        Number(amount),

                    month
                })
            }
        );


        showNotification(
            "Budget created successfully."
        );


        closeBudgetModal();

        await loadBudgets();


    } catch (error) {

        showNotification(
            error.message ||
            "Could not create budget.",
            "error"
        );


    } finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                "Create Budget";
        }
    }
}


async function deleteBudget(
    id
) {

    const confirmed =
        confirm(
            "Delete this budget?"
        );


    if (!confirmed) {
        return;
    }


    try {

        await api(
            `/budgets/${id}`,
            {
                method: "DELETE"
            }
        );


        showNotification(
            "Budget deleted."
        );


        await loadBudgets();


    } catch (error) {

        showNotification(
            error.message ||
            "Could not delete budget.",
            "error"
        );
    }
}


window.deleteBudget =
    deleteBudget;


/* =========================================================
   GOALS
   ========================================================= */

async function loadGoals() {

    try {

        const data =
            await api(
                "/goals",
                {
                    method: "GET"
                }
            );


        goals =
            Array.isArray(
                data.goals
            )
                ? data.goals
                : [];


        renderGoals();


    } catch (error) {

        console.error(
            "Goal loading error:",
            error
        );


        goals = [];

        renderGoals();
    }
}


function renderGoals() {

    const container =
        $("goalsList");


    if (!container) {
        return;
    }


    if (goals.length === 0) {

        container.innerHTML = `
            <div class="card">

                <div class="empty-state">

                    No savings goals created yet.

                    <br>

                    Click
                    <strong>
                        + Create Goal
                    </strong>
                    to get started.

                </div>

            </div>
        `;

        return;
    }


    container.innerHTML =
        goals.map(
            goal => {

                const target =
                    Number(
                        goal.target_amount
                    ) || 0;


                const current =
                    Number(
                        goal.current_amount
                    ) || 0;


                const percentage =
                    target > 0
                        ? Math.min(
                            100,
                            (
                                current /
                                target
                            ) * 100
                        )
                        : 0;


                return `
                    <div class="goal-card">

                        <div class="goal-top">

                            <div class="goal-icon">
                                ◎
                            </div>


                            <button
                                class="delete-button"
                                onclick="deleteGoal(${goal.id})"
                                title="Delete goal"
                            >
                                ×
                            </button>

                        </div>


                        <div class="goal-name">

                            ${escapeHTML(
                                goal.name
                            )}

                        </div>


                        <div class="goal-amount">

                            ${formatCurrency(
                                current
                            )}

                        </div>


                        <div class="goal-target">

                            of
                            ${formatCurrency(
                                target
                            )}

                        </div>


                        <div
                            class="budget-progress"
                            style="
                                margin-top:14px;
                            "
                        >

                            <span
                                style="
                                    width:${percentage}%;
                                "
                            ></span>

                        </div>


                        <div
                            style="
                                display:flex;
                                justify-content:space-between;
                                margin-top:7px;
                                font-size:9px;
                                color:var(--muted);
                            "
                        >

                            <span>

                                ${Math.round(
                                    percentage
                                )}% complete

                            </span>


                            <span>

                                ${
                                    goal.target_date
                                        ? formatDate(
                                            goal.target_date
                                        )
                                        : "No date"
                                }

                            </span>

                        </div>


                        ${
                            goal.description
                                ? `
                                    <p
                                        style="
                                            margin-top:12px;
                                            color:var(--muted);
                                            font-size:9px;
                                            line-height:1.5;
                                        "
                                    >

                                        ${escapeHTML(
                                            goal.description
                                        )}

                                    </p>
                                `
                                : ""
                        }


                        <button
                            class="secondary-button"
                            style="
                                width:100%;
                                margin-top:14px;
                            "
                            onclick="
                                addGoalProgress(
                                    ${goal.id},
                                    ${target},
                                    ${current}
                                )
                            "
                        >

                            Update Progress

                        </button>

                    </div>
                `;
            }
        ).join("");
}
/* =========================================================
   GOAL MODAL
   ========================================================= */

function ensureGoalModal() {

    if ($("goalModal")) {
        return;
    }


    const modal =
        document.createElement(
            "div"
        );

    modal.className =
        "modal";

    modal.id =
        "goalModal";


    modal.innerHTML = `
        <div class="modal-card">

            <div class="modal-header">

                <h3>
                    Create Savings Goal
                </h3>

                <button
                    type="button"
                    class="close-button"
                    id="closeGoalModal"
                >
                    ×
                </button>

            </div>


            <form id="goalForm">

                <div class="form-grid">

                    <div class="form-group full">

                        <label class="form-label">
                            Goal Name
                        </label>

                        <input
                            class="form-control"
                            id="goalName"
                            type="text"
                            placeholder="e.g. New Laptop"
                            required
                        >

                    </div>


                    <div class="form-group">

                        <label class="form-label">
                            Target Amount
                        </label>

                        <input
                            class="form-control"
                            id="goalTarget"
                            type="number"
                            min="1"
                            step="0.01"
                            placeholder="₹ 50,000"
                            required
                        >

                    </div>


                    <div class="form-group">

                        <label class="form-label">
                            Current Saved
                        </label>

                        <input
                            class="form-control"
                            id="goalCurrent"
                            type="number"
                            min="0"
                            step="0.01"
                            value="0"
                            placeholder="₹ 0"
                        >

                    </div>


                    <div class="form-group full">

                        <label class="form-label">
                            Target Date
                        </label>

                        <input
                            class="form-control"
                            id="goalDate"
                            type="date"
                        >

                    </div>


                    <div class="form-group full">

                        <label class="form-label">
                            Description
                        </label>

                        <textarea
                            class="form-control"
                            id="goalDescription"
                            rows="3"
                            placeholder="Describe your savings goal..."
                        ></textarea>

                    </div>

                </div>


                <div class="modal-actions">

                    <button
                        type="button"
                        class="secondary-button"
                        id="cancelGoalBtn"
                    >
                        Cancel
                    </button>


                    <button
                        type="submit"
                        class="primary-button"
                        id="saveGoalBtn"
                    >
                        Create Goal
                    </button>

                </div>

            </form>

        </div>
    `;


    document.body.appendChild(
        modal
    );


    $("closeGoalModal")
        ?.addEventListener(
            "click",
            closeGoalModal
        );


    $("cancelGoalBtn")
        ?.addEventListener(
            "click",
            closeGoalModal
        );


    modal.addEventListener(
        "click",
        event => {

            if (
                event.target === modal
            ) {

                closeGoalModal();
            }
        }
    );


    $("goalForm")
        ?.addEventListener(
            "submit",
            saveGoal
        );


    const current =
        $("goalCurrent");

    if (current) {

        current.value =
            "0";
    }
}


function openGoalModal() {

    ensureGoalModal();


    const modal =
        $("goalModal");

    if (!modal) {
        return;
    }


    const form =
        $("goalForm");

    if (form) {
        form.reset();
    }


    const current =
        $("goalCurrent");

    if (current) {

        current.value =
            "0";
    }


    modal.classList.add(
        "show"
    );
}


function closeGoalModal() {

    const modal =
        $("goalModal");

    if (modal) {

        modal.classList.remove(
            "show"
        );
    }
}


async function saveGoal(
    event
) {

    event.preventDefault();


    const name =
        $("goalName")
            ?.value
            .trim();


    const target =
        $("goalTarget")
            ?.value;


    const current =
        $("goalCurrent")
            ?.value ||
        0;


    const targetDate =
        $("goalDate")
            ?.value ||
        "";


    const description =
        $("goalDescription")
            ?.value
            .trim() ||
        "";


    if (!name) {

        showNotification(
            "Please enter a goal name.",
            "error"
        );

        return;
    }


    if (
        !target ||
        Number(target) <= 0
    ) {

        showNotification(
            "Please enter a valid target amount.",
            "error"
        );

        return;
    }


    if (
        Number(current) < 0
    ) {

        showNotification(
            "Current saved amount cannot be negative.",
            "error"
        );

        return;
    }


    const button =
        $("saveGoalBtn");


    if (button) {

        button.disabled =
            true;

        button.textContent =
            "Creating...";
    }


    try {

        await api(
            "/goals",
            {
                method: "POST",

                body: JSON.stringify({

                    name,

                    target_amount:
                        Number(target),

                    current_amount:
                        Number(current),

                    target_date:
                        targetDate,

                    description

                })
            }
        );


        showNotification(
            "Savings goal created."
        );


        closeGoalModal();

        await loadGoals();


    } catch (error) {

        showNotification(
            error.message ||
            "Could not create goal.",
            "error"
        );


    } finally {

        if (button) {

            button.disabled =
                false;

            button.textContent =
                "Create Goal";
        }
    }
}


async function addGoalProgress(
    id,
    target,
    current
) {

    const value =
        prompt(
            `Enter your new saved amount.\n\nCurrent: ${formatCurrency(current)}\nTarget: ${formatCurrency(target)}`,
            current
        );


    if (value === null) {
        return;
    }


    const amount =
        Number(value);


    if (
        Number.isNaN(amount) ||
        amount < 0
    ) {

        showNotification(
            "Please enter a valid amount.",
            "error"
        );

        return;
    }


    try {

        await api(
            `/goals/${id}`,
            {
                method: "PUT",

                body: JSON.stringify({

                    current_amount:
                        amount

                })
            }
        );


        showNotification(
            "Goal progress updated."
        );


        await loadGoals();


    } catch (error) {

        showNotification(
            error.message ||
            "Could not update goal.",
            "error"
        );
    }
}


window.addGoalProgress =
    addGoalProgress;


async function deleteGoal(
    id
) {

    const confirmed =
        confirm(
            "Delete this savings goal?"
        );


    if (!confirmed) {
        return;
    }


    try {

        await api(
            `/goals/${id}`,
            {
                method: "DELETE"
            }
        );


        showNotification(
            "Goal deleted."
        );


        await loadGoals();


    } catch (error) {

        showNotification(
            error.message ||
            "Could not delete goal.",
            "error"
        );
    }
}


window.deleteGoal =
    deleteGoal;
    /* =========================================================
   PROFILE
   ========================================================= */

function setupProfile() {

    const form =
        $("profileForm");

    if (!form) {
        return;
    }


    form.addEventListener(
        "submit",
        event => {

            event.preventDefault();


            const name =
                $("profileNameInput")
                    ?.value
                    .trim();


            if (!name) {

                showNotification(
                    "Name cannot be empty.",
                    "error"
                );

                return;
            }


            if (currentUser) {

                currentUser.name =
                    name;

                updateUserUI();
            }


            showNotification(
                "Profile updated for this session."
            );
        }
    );
}


/* =========================================================
   SETTINGS
   ========================================================= */

function setupSettings() {

    document
        .querySelectorAll(
            ".toggle"
        )
        .forEach(
            toggle => {

                toggle.addEventListener(
                    "click",
                    () => {

                        toggle.classList.toggle(
                            "active"
                        );
                    }
                );
            }
        );
}


/* =========================================================
   SEARCH BUTTON
   ========================================================= */

function setupSearchButton() {

    const button =
        $("searchButton");

    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        () => {

            openSection(
                "transactions"
            );


            setTimeout(
                () => {

                    const input =
                        $("searchInput");

                    if (input) {

                        input.focus();
                    }

                },
                100
            );
        }
    );
}


/* =========================================================
   NOTIFICATION BUTTON
   ========================================================= */

function setupNotificationButton() {

    const button =
        $("notificationButton");

    if (!button) {
        return;
    }


    button.addEventListener(
        "click",
        () => {

            showNotification(
                "You're all caught up."
            );
        }
    );
}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function setupEventListeners() {

    /* Navigation */

    document
        .querySelectorAll(
            ".nav-item"
        )
        .forEach(
            item => {

                item.addEventListener(
                    "click",
                    () => {

                        openSection(
                            item.dataset.section
                        );
                    }
                );
            }
        );


    /* Dashboard section links */

    document
        .querySelectorAll(
            "[data-go-section]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        openSection(
                            button.dataset.goSection
                        );
                    }
                );
            }
        );


    /* Mobile menu */

    $("mobileMenu")
        ?.addEventListener(
            "click",
            openMobileSidebar
        );


    /* Transaction modal */

    $("addTransactionBtn")
        ?.addEventListener(
            "click",
            openTransactionModal
        );


    $("cancelTransactionBtn")
        ?.addEventListener(
            "click",
            closeTransactionModal
        );


    $("closeTransactionModal")
        ?.addEventListener(
            "click",
            closeTransactionModal
        );


    $("transactionModal")
        ?.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    $("transactionModal")
                ) {

                    closeTransactionModal();
                }
            }
        );


    $("transactionForm")
        ?.addEventListener(
            "submit",
            saveTransaction
        );


    /* Budget */

    $("addBudgetBtn")
        ?.addEventListener(
            "click",
            openBudgetModal
        );


    /* Goals */

    $("addGoalBtn")
        ?.addEventListener(
            "click",
            openGoalModal
        );


    /* Filters */

    [
        "searchInput",
        "typeFilter",
        "categoryFilter",
        "sortFilter"
    ].forEach(
        id => {

            $(id)?.addEventListener(
                "input",
                () => {

                    currentPage = 1;

                    renderTransactions();
                }
            );


            $(id)?.addEventListener(
                "change",
                () => {

                    currentPage = 1;

                    renderTransactions();
                }
            );
        }
    );


    setupSearchButton();

    setupNotificationButton();

    setupProfile();

    setupSettings();


    /* Close modals with Escape */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key !==
                "Escape"
            ) {
                return;
            }


            closeTransactionModal();

            closeBudgetModal();

            closeGoalModal();
        }
    );
}


/* =========================================================
   OPTIONAL EXPORT BUTTON
   ========================================================= */

function addExportButton() {

    const transactionHeader =
        document.querySelector(
            "#transactionsSection .page-header"
        );


    if (
        !transactionHeader ||
        document.querySelector(
            "#exportCSVButton"
        )
    ) {
        return;
    }


    const button =
        document.createElement(
            "button"
        );


    button.id =
        "exportCSVButton";


    button.className =
        "secondary-button";


    button.textContent =
        "Export CSV";


    button.style.marginRight =
        "8px";


    button.addEventListener(
        "click",
        exportTransactionsCSV
    );


    const addButton =
        $("addTransactionBtn");


    if (addButton) {

        addButton.parentNode.insertBefore(
            button,
            addButton
        );
    }
}
/* =========================================================
   THEME
   ========================================================= */

function setupTheme() {

    const saved =
        localStorage.getItem(
            "pet-theme"
        );


    if (
        saved === "dark"
    ) {

        document.body.classList.add(
            "dark"
        );
    }


    const button =
        $("themeButton");


    if (button) {

        button.addEventListener(
            "click",
            () => {

                document.body.classList.toggle(
                    "dark"
                );


                const isDark =
                    document.body.classList.contains(
                        "dark"
                    );


                localStorage.setItem(
                    "pet-theme",
                    isDark
                        ? "dark"
                        : "light"
                );


                button.textContent =
                    isDark
                        ? "☀"
                        : "☾";
            }
        );
    }
}


/* =========================================================
   CSV EXPORT
   ========================================================= */

function exportTransactionsCSV() {

    if (
        transactions.length === 0
    ) {

        showNotification(
            "There are no transactions to export.",
            "error"
        );

        return;
    }


    const header = [

        "Description",
        "Amount",
        "Type",
        "Category",
        "Date",
        "Payment Method",
        "Notes"

    ];


    const rows =
        transactions.map(
            transaction => [

                transaction.description,

                transaction.amount,

                transaction.type,

                transaction.category,

                transaction.date,

                transaction.payment_method,

                transaction.notes

            ]
        );


    const csvRows = [

        header,
        ...rows

    ];


    const csv =
        csvRows
            .map(
                row =>
                    row.map(
                        value =>
                            `"${String(
                                value ?? ""
                            ).replace(
                                /"/g,
                                '""'
                            )}"`
                    ).join(",")
            )
            .join("\n");


    const blob =
        new Blob(
            [csv],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;


    link.download =
        "PET-transactions.csv";


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    URL.revokeObjectURL(
        url
    );


    showNotification(
        "Transactions exported successfully."
    );
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initializePET() {

    setupTheme();

    setupEventListeners();

    ensureBudgetModal();

    ensureGoalModal();

    addExportButton();


    const authenticated =
        await loadCurrentUser();


    if (!authenticated) {
        return;
    }


    await loadTransactions();

    await loadBudgets();

    await loadGoals();


    openSection(
        "dashboard"
    );
}


/* =========================================================
   START APPLICATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializePET
);
/* =========================================================
   NAVIGATION
   ========================================================= */

const sectionTitles = {

    dashboard: {

        title:
            "Dashboard",

        subtitle:
            "Here's your financial overview"
    },


    transactions: {

        title:
            "Transactions",

        subtitle:
            "Track every rupee that comes in or goes out."
    },


    budgets: {

        title:
            "Budgets",

        subtitle:
            "Plan your spending before the month begins."
    },


    goals: {

        title:
            "Savings Goals",

        subtitle:
            "Turn your savings into measurable progress."
    },


    analytics: {

        title:
            "Analytics",

        subtitle:
            "Understand your financial patterns."
    },


    profile: {

        title:
            "Profile",

        subtitle:
            "Manage your personal information."
    },


    settings: {

        title:
            "Settings",

        subtitle:
            "Customize your PET experience."
    }

};


function openSection(
    section
) {

    if (
        !sectionTitles[section]
    ) {

        return;
    }


    currentSection =
        section;


    /*
     * Show only the selected section
     */

    document
        .querySelectorAll(
            ".section"
        )
        .forEach(
            element => {

                element.classList.toggle(
                    "active",

                    element.id ===
                        `${section}Section`
                );

            }
        );


    /*
     * Update active sidebar item
     */

    document
        .querySelectorAll(
            ".nav-item"
        )
        .forEach(
            item => {

                item.classList.toggle(
                    "active",

                    item.dataset.section ===
                        section
                );

            }
        );


    /*
     * Update page title
     */

    const pageTitle =
        $("pageTitle");


    const pageSubtitle =
        document.querySelector(
            ".page-subtitle"
        );


    if (pageTitle) {

        pageTitle.textContent =
            sectionTitles[
                section
            ].title;
    }


    if (pageSubtitle) {

        pageSubtitle.textContent =
            sectionTitles[
                section
            ].subtitle;
    }


    /*
     * Load section-specific data
     */

    if (
        section ===
        "budgets"
    ) {

        loadBudgets();
    }


    if (
        section ===
        "goals"
    ) {

        loadGoals();
    }


    if (
        section ===
        "analytics"
    ) {

        renderAnalytics();

        renderMonthlyChart();

        renderCategoryChart();

        renderBalanceMiniChart();
    }


    if (
        section ===
        "dashboard"
    ) {

        renderDashboardSummary();

        renderRecentTransactions();

        renderExpenseChart();

        renderDashboardBudgets();

        renderInsights();
    }


    /*
     * Close mobile sidebar
     */

    closeMobileSidebar();
}


window.openSection =
    openSection;


/* =========================================================
   MOBILE SIDEBAR
   ========================================================= */

function openMobileSidebar() {

    const sidebar =
        $("sidebar");


    if (sidebar) {

        sidebar.classList.add(
            "open"
        );
    }
}


function closeMobileSidebar() {

    const sidebar =
        $("sidebar");


    if (sidebar) {

        sidebar.classList.remove(
            "open"
        );
    }
}
/* =========================================================
   EXPENSE CHART
   ========================================================= */

function getExpenseByCategory() {

    const map = {};


    transactions.forEach(
        transaction => {

            if (
                transaction.type !==
                "expense"
            ) {
                return;
            }


            const category =
                transaction.category ||
                "Other";


            map[category] =
                (
                    map[category] ||
                    0
                ) +
                Number(
                    transaction.amount
                );
        }
    );


    return map;
}


function renderExpenseChart() {

    const canvas =
        $("expenseChart");


    if (!canvas) {
        return;
    }


    if (
        typeof Chart ===
        "undefined"
    ) {
        return;
    }


    const data =
        getExpenseByCategory();


    const labels =
        Object.keys(data);


    const values =
        Object.values(data);


    if (expenseChart) {

        expenseChart.destroy();

        expenseChart = null;
    }


    expenseChart =
        new Chart(
            canvas,
            {
                type:
                    "doughnut",

                data: {

                    labels,

                    datasets: [
                        {
                            data:
                                values
                        }
                    ]
                },

                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        legend: {
                            display:
                                false
                        }
                    },

                    cutout:
                        "68%"
                }
            }
        );


    const legend =
        $("expenseLegend");


    if (!legend) {
        return;
    }


    if (
        labels.length ===
        0
    ) {

        legend.innerHTML = `
            <div class="empty-state">
                No expense data yet.
            </div>
        `;

        return;
    }


    legend.innerHTML =
        labels.map(
            (
                label,
                index
            ) => {

                return `
                    <div class="legend-item">

                        <span
                            class="legend-dot"
                            style="
                                background:
                                hsl(
                                    ${
                                        index *
                                        47
                                    },
                                    70%,
                                    58%
                                );
                            "
                        ></span>

                        ${escapeHTML(
                            label
                        )}

                    </div>
                `;
            }
        ).join("");
}


/* =========================================================
   MONTHLY DATA
   ========================================================= */

function getMonthlyData() {

    const months = {};


    transactions.forEach(
        transaction => {

            const date =
                transaction.date;


            if (!date) {
                return;
            }


            const month =
                date.slice(
                    0,
                    7
                );


            if (!months[month]) {

                months[month] = {

                    income:
                        0,

                    expense:
                        0
                };
            }


            if (
                transaction.type ===
                "income"
            ) {

                months[month].income +=
                    Number(
                        transaction.amount
                    );

            } else {

                months[month].expense +=
                    Number(
                        transaction.amount
                    );
            }
        }
    );


    const keys =
        Object.keys(
            months
        )
        .sort();


    return {

        labels:
            keys,

        income:
            keys.map(
                key =>
                    months[key]
                        .income
            ),

        expense:
            keys.map(
                key =>
                    months[key]
                        .expense
            )
    };
}


/* =========================================================
   MONTHLY CHART
   ========================================================= */

function renderMonthlyChart() {

    const canvas =
        $("monthlyChart");


    if (!canvas) {
        return;
    }


    if (
        typeof Chart ===
        "undefined"
    ) {
        return;
    }


    const data =
        getMonthlyData();


    if (monthlyChart) {

        monthlyChart.destroy();

        monthlyChart = null;
    }


    monthlyChart =
        new Chart(
            canvas,
            {
                type:
                    "line",

                data: {

                    labels:
                        data.labels,

                    datasets: [

                        {
                            label:
                                "Income",

                            data:
                                data.income,

                            tension:
                                0.35
                        },

                        {
                            label:
                                "Expenses",

                            data:
                                data.expense,

                            tension:
                                0.35
                        }

                    ]
                },

                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        legend: {
                            display:
                                true
                        }
                    },

                    scales: {

                        y: {

                            beginAtZero:
                                true
                        }
                    }
                }
            }
        );
}


/* =========================================================
   CATEGORY CHART
   ========================================================= */

function renderCategoryChart() {

    const canvas =
        $("categoryChart");


    if (!canvas) {
        return;
    }


    if (
        typeof Chart ===
        "undefined"
    ) {
        return;
    }


    const data =
        getExpenseByCategory();


    const labels =
        Object.keys(data);


    const values =
        Object.values(data);


    if (categoryChart) {

        categoryChart.destroy();

        categoryChart = null;
    }


    categoryChart =
        new Chart(
            canvas,
            {
                type:
                    "bar",

                data: {

                    labels,

                    datasets: [

                        {
                            label:
                                "Expenses",

                            data:
                                values
                        }

                    ]
                },

                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        legend: {

                            display:
                                false
                        }
                    },

                    scales: {

                        y: {

                            beginAtZero:
                                true
                        }
                    }
                }
            }
        );
}


/* =========================================================
   MINI BALANCE CHART
   ========================================================= */

function renderBalanceMiniChart() {

    const canvas =
        $("balanceMiniChart");


    if (!canvas) {
        return;
    }


    if (
        typeof Chart ===
        "undefined"
    ) {
        return;
    }


    const monthly =
        getMonthlyData();


    const balance =
        monthly.labels.map(
            (
                label,
                index
            ) => {

                return (
                    monthly.income[index] -
                    monthly.expense[index]
                );
            }
        );


    if (balanceMiniChart) {

        balanceMiniChart.destroy();

        balanceMiniChart =
            null;
    }


    balanceMiniChart =
        new Chart(
            canvas,
            {
                type:
                    "line",

                data: {

                    labels:
                        monthly.labels,

                    datasets: [

                        {
                            data:
                                balance,

                            borderWidth:
                                2,

                            pointRadius:
                                0,

                            fill:
                                true,

                            tension:
                                0.4
                        }

                    ]
                },

                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        legend: {

                            display:
                                false
                        }
                    },

                    scales: {

                        x: {

                            display:
                                false
                        },

                        y: {

                            display:
                                false
                        }
                    }
                }
            }
        );
}
/* =========================================================
   ANALYTICS
   ========================================================= */

function renderAnalytics() {

    const expenses =
        transactions.filter(
            transaction =>
                transaction.type ===
                "expense"
        );


    const summary =
        calculateSummary();


    const totalExpense =
        expenses.reduce(
            (
                total,
                transaction
            ) =>
                total +
                Number(
                    transaction.amount
                ),
            0
        );


    const average =
        expenses.length > 0
            ? totalExpense /
              expenses.length
            : 0;


    const largest =
        expenses.length > 0
            ? Math.max(
                ...expenses.map(
                    transaction =>
                        Number(
                            transaction.amount
                        )
                )
            )
            : 0;


    const totalTransactions =
        $("analyticsTransactions");


    if (totalTransactions) {

        totalTransactions.textContent =
            formatNumber(
                transactions.length
            );
    }


    const averageElement =
        $("averageExpense");


    if (averageElement) {

        averageElement.textContent =
            formatCurrency(
                average
            );
    }


    const largestElement =
        $("largestExpense");


    if (largestElement) {

        largestElement.textContent =
            formatCurrency(
                largest
            );
    }


    const incomeElement =
        $("analyticsIncome");


    if (incomeElement) {

        incomeElement.textContent =
            formatCurrency(
                summary.income
            );
    }


    const expenseElement =
        $("analyticsExpense");


    if (expenseElement) {

        expenseElement.textContent =
            formatCurrency(
                summary.expense
            );
    }


    const insights =
        $("analyticsInsights");


    if (!insights) {
        return;
    }


    if (
        transactions.length ===
        0
    ) {

        insights.innerHTML = `
            <div class="empty-state">
                Add transactions to generate insights.
            </div>
        `;

        return;
    }


    const categoryData =
        getExpenseByCategory();


    const topCategory =
        Object.entries(
            categoryData
        )
        .sort(
            (a, b) =>
                b[1] - a[1]
        )[0];


    let html = "";


    if (topCategory) {

        html += `
            <div class="insight">

                <div class="insight-icon">
                    ↗
                </div>

                <div>

                    <strong>
                        Top spending category
                    </strong>

                    <p>
                        ${escapeHTML(
                            topCategory[0]
                        )}
                        accounts for
                        ${formatCurrency(
                            topCategory[1]
                        )}
                        of your expenses.
                    </p>

                </div>

            </div>
        `;
    }


    html += `
        <div class="insight">

            <div class="insight-icon">
                ₹
            </div>

            <div>

                <strong>
                    Savings rate
                </strong>

                <p>
                    Your current savings rate is
                    ${Math.round(
                        summary.savingsRate
                    )}%.
                </p>

            </div>

        </div>
    `;


    if (
        summary.expense >
            summary.income &&
        summary.income > 0
    ) {

        html += `
            <div class="insight">

                <div class="insight-icon">
                    !
                </div>

                <div>

                    <strong>
                        Expenses exceed income
                    </strong>

                    <p>
                        Review your recent
                        spending and consider
                        setting category budgets.
                    </p>

                </div>

            </div>
        `;
    }


    insights.innerHTML =
        html;
}


/* =========================================================
   DASHBOARD INSIGHTS
   ========================================================= */

function renderInsights() {

    const container =
        $("dashboardInsights");


    if (!container) {
        return;
    }


    const summary =
        calculateSummary();


    if (
        transactions.length ===
        0
    ) {

        container.innerHTML = `
            <div class="insight">

                <div class="insight-icon">
                    ✦
                </div>

                <div>

                    <strong>
                        Welcome to PET
                    </strong>

                    <p>
                        Add your first transaction
                        to start understanding your
                        financial habits.
                    </p>

                </div>

            </div>
        `;

        return;
    }


    const categoryData =
        getExpenseByCategory();


    const topCategory =
        Object.entries(
            categoryData
        )
        .sort(
            (a, b) =>
                b[1] - a[1]
        )[0];


    let html = "";


    if (topCategory) {

        html += `
            <div class="insight">

                <div class="insight-icon">
                    ◈
                </div>

                <div>

                    <strong>
                        Biggest spending area
                    </strong>

                    <p>
                        ${escapeHTML(
                            topCategory[0]
                        )}
                        is currently your
                        largest expense category.
                    </p>

                </div>

            </div>
        `;
    }


    if (
        summary.savingsRate >=
        20
    ) {

        html += `
            <div class="insight">

                <div class="insight-icon">
                    ✓
                </div>

                <div>

                    <strong>
                        Healthy saving
                    </strong>

                    <p>
                        You're saving at least
                        20% of your income.
                    </p>

                </div>

            </div>
        `;

    } else {

        html += `
            <div class="insight">

                <div class="insight-icon">
                    ✦
                </div>

                <div>

                    <strong>
                        Build your savings
                    </strong>

                    <p>
                        Consider setting a savings
                        goal and creating category
                        budgets.
                    </p>

                </div>

            </div>
        `;
    }


    if (
        summary.expense >
            summary.income &&
        summary.income > 0
    ) {

        html += `
            <div class="insight">

                <div class="insight-icon">
                    !
                </div>

                <div>

                    <strong>
                        Expenses exceed income
                    </strong>

                    <p>
                        Your expenses are currently
                        higher than your income.
                        Review your recent spending.
                    </p>

                </div>

            </div>
        `;
    }


    container.innerHTML =
        html;
}
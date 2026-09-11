const API_BASE = "http://127.0.0.1:8000";

let beforeFile = null;
let afterFile = null;

const $ = id => document.getElementById(id);


/* -----------------------------
   BASIC HELPERS
----------------------------- */

function esc(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function absoluteUrl(url) {

    if (!url) {
        return "";
    }

    if (
        url.startsWith("http://") ||
        url.startsWith("https://") ||
        url.startsWith("data:") ||
        url.startsWith("blob:")
    ) {
        return url;
    }

    if (url.startsWith("/")) {
        return API_BASE + url;
    }

    return API_BASE + "/" + url;
}


function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


/* -----------------------------
   QUERY
----------------------------- */

function setExample(text) {
    $("query").value = text;
}


function clearQuery() {

    $("query").value = "";

    $("results").classList.add(
        "hidden"
    );

    $("errorBox").classList.add(
        "hidden"
    );

    document
        .querySelectorAll(".pipeline-step")
        .forEach(step => {

            step.classList.remove(
                "active",
                "done"
            );

        });

    $("pipelineStatus").textContent =
        "READY";
}


function scrollToSection(id) {

    const element =
        document.getElementById(id);

    if (element) {

        element.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}


/* -----------------------------
   PIPELINE
----------------------------- */

function activateStep(number) {

    document
        .querySelectorAll(".pipeline-step")
        .forEach(step => {

            const stepNumber =
                Number(
                    step.dataset.step
                );

            step.classList.remove(
                "active"
            );

            if (
                stepNumber < number
            ) {
                step.classList.add(
                    "done"
                );
            } else {
                step.classList.remove(
                    "done"
                );
            }

            if (
                stepNumber === number
            ) {
                step.classList.add(
                    "active"
                );
            }

        });
}


function finishPipeline() {

    document
        .querySelectorAll(".pipeline-step")
        .forEach(step => {

            step.classList.remove(
                "active"
            );

            step.classList.add(
                "done"
            );

        });

    $("pipelineStatus").textContent =
        "COMPLETE";
}


/* -----------------------------
   ERRORS
----------------------------- */

function showError(message) {

    $("errorBox").innerHTML = `
        <strong>Analysis error</strong>
        <span>${esc(message)}</span>
    `;

    $("errorBox").classList.remove(
        "hidden"
    );
}


/* -----------------------------
   FILE UPLOAD
----------------------------- */

function handleDragOver(event, id) {

    event.preventDefault();

    const zone =
        document.getElementById(id);

    if (zone) {
        zone.classList.add(
            "dragging"
        );
    }
}


function handleDragLeave(id) {

    const zone =
        document.getElementById(id);

    if (zone) {
        zone.classList.remove(
            "dragging"
        );
    }
}


function handleDrop(event, type) {

    event.preventDefault();

    const zoneId =
        type === "before"
            ? "beforeDropZone"
            : "afterDropZone";

    handleDragLeave(zoneId);

    const file =
        event.dataTransfer.files[0];

    if (file) {
        handleFile(file, type);
    }
}


function handleFile(file, type) {

    if (!file) {
        return;
    }

    const extension =
        file.name
            .split(".")
            .pop()
            .toLowerCase();

    const allowedExtensions = [
        "png",
        "jpg",
        "jpeg",
        "tif",
        "tiff",
        "webp"
    ];

    if (
        !allowedExtensions.includes(
            extension
        )
    ) {

        showError(
            "Unsupported file. Please upload PNG, JPG, JPEG, TIFF or GeoTIFF."
        );

        return;
    }

    if (
        file.size >
        200 * 1024 * 1024
    ) {

        showError(
            "File exceeds the 200 MB upload limit."
        );

        return;
    }

    if (type === "before") {

        beforeFile = file;

        renderFile(
            file,
            "beforeFile",
            "beforeDropZone"
        );

    } else {

        afterFile = file;

        renderFile(
            file,
            "afterFile",
            "afterDropZone"
        );
    }

    $("errorBox").classList.add(
        "hidden"
    );
}


function renderFile(
    file,
    containerId,
    zoneId
) {

    const container =
        $(containerId);

    const zone =
        $(zoneId);

    container.classList.remove(
        "hidden"
    );

    zone.classList.add(
        "has-file"
    );

    const sizeMB =
        (
            file.size /
            (1024 * 1024)
        ).toFixed(2);

    const extension =
        file.name
            .split(".")
            .pop()
            .toUpperCase();

    /*
       PNG/JPG/JPEG/WEBP:
       Browser preview.

       TIFF:
       Browser support varies, so the UI
       keeps a clean file representation.
    */

    const browserPreview =
        [
            "png",
            "jpg",
            "jpeg",
            "webp"
        ].includes(
            extension.toLowerCase()
        );

    if (browserPreview) {

        const reader =
            new FileReader();

        reader.onload = function(event) {

            container.innerHTML = `

                <div class="preview-thumbnail">
                    <img
                        src="${event.target.result}"
                        alt="Satellite image preview"
                    >
                </div>

                <div class="file-info">
                    <strong>
                        ${esc(file.name)}
                    </strong>

                    <span>
                        ${sizeMB} MB ·
                        ${extension}
                    </span>
                </div>

                <button
                    class="remove-file"
                    onclick="removeFile(
                        '${zoneId === "beforeDropZone"
                            ? "before"
                            : "after"}',
                        event
                    )"
                >
                    ×
                </button>

            `;
        };

        reader.readAsDataURL(file);

    } else {

        container.innerHTML = `

            <div class="preview-thumbnail tiff-preview">
                TIFF
            </div>

            <div class="file-info">
                <strong>
                    ${esc(file.name)}
                </strong>

                <span>
                    ${sizeMB} MB ·
                    ${extension}
                </span>
            </div>

            <button
                class="remove-file"
                onclick="removeFile(
                    '${zoneId === "beforeDropZone"
                        ? "before"
                        : "after"}',
                    event
                )"
            >
                ×
            </button>

        `;
    }
}


function removeFile(
    type,
    event
) {

    if (event) {
        event.stopPropagation();
    }

    if (type === "before") {

        beforeFile = null;

        $("beforeInput").value = "";

        $("beforeFile").classList.add(
            "hidden"
        );

        $("beforeFile").innerHTML = "";

        $("beforeDropZone")
            .classList
            .remove("has-file");

    } else {

        afterFile = null;

        $("afterInput").value = "";

        $("afterFile").classList.add(
            "hidden"
        );

        $("afterFile").innerHTML = "";

        $("afterDropZone")
            .classList
            .remove("has-file");
    }
}


/* -----------------------------
   UPLOADED IMAGE ANALYSIS
----------------------------- */

async function uploadComparison() {

    if (!beforeFile) {

        showError(
            "Please upload a primary image first."
        );

        return;
    }

    if (!afterFile) {

        showError(
            "Please upload a comparison image."
        );

        return;
    }

    $("errorBox").classList.add(
        "hidden"
    );

    $("results").classList.remove(
        "hidden"
    );

    $("resultTitle").textContent =
        "Uploaded Image Change Detection";

    $("confidence").textContent =
        "COMPUTED";

    activateStep(5);

    $("pipelineStatus").textContent =
        "ANALYZING";

    /*
       Show uploaded images immediately.
       This does NOT depend on backend URLs.
    */

    renderUploadedPreview();


    const formData =
        new FormData();

    formData.append(
        "before",
        beforeFile
    );

    formData.append(
        "after",
        afterFile
    );

    try {

        const response =
            await fetch(
                `${API_BASE}/change-detection`,
                {
                    method: "POST",
                    body: formData
                }
            );

        if (!response.ok) {

            throw new Error(
                `Backend returned HTTP ${response.status}`
            );
        }

        const data =
            await response.json();

        if (!data.success) {

            throw new Error(
                data.error ||
                "Change detection failed."
            );
        }

        activateStep(6);

        renderUploadedChange(
            data
        );

        activateStep(7);

        renderUploadRecommendation(
            data
        );

        activateStep(8);

        finishPipeline();

    } catch (error) {

        console.error(error);

        showError(
            error.message
        );

        $("pipelineStatus").textContent =
            "ERROR";
    }
}


function renderUploadedPreview() {

    const beforeURL =
        URL.createObjectURL(
            beforeFile
        );

    const afterURL =
        URL.createObjectURL(
            afterFile
        );

    $("observation").textContent =
        "The uploaded primary and comparison images are being evaluated using pixel-level visual comparison.";

    $("resultText").textContent =
        "The system compares the two images and generates a visual change map. The result is a change proxy and should be validated against geospatial metadata and domain-specific imagery.";

    $("comparisonSection").innerHTML = `

        <div class="uploaded-comparison">

            <div class="uploaded-image">

                <div class="image-label">
                    PRIMARY IMAGE
                </div>

                <img
                    src="${beforeURL}"
                    alt="Primary satellite imagery"
                >

                <div class="uploaded-name">
                    ${esc(beforeFile.name)}
                </div>

            </div>


            <div class="uploaded-image">

                <div class="image-label">
                    COMPARISON IMAGE
                </div>

                <img
                    src="${afterURL}"
                    alt="Comparison satellite imagery"
                >

                <div class="uploaded-name">
                    ${esc(afterFile.name)}
                </div>

            </div>

        </div>
    `;
}


/* -----------------------------
   UPLOADED CHANGE RESULT
----------------------------- */

function renderUploadedChange(
    data
) {

    const difference =
        data.difference || {};

    const percentage =
        Number(
            difference.change_percentage ||
            0
        );

    const imageURL =
        absoluteUrl(
            difference.url
        );

    $("changeSection").innerHTML = `

        <div class="change-result">

            <div class="change-image">

                ${
                    imageURL
                    ?
                    `
                    <img
                        src="${imageURL}"
                        alt="Computed change detection map"
                        onerror="this.parentElement.innerHTML='<div class=&quot;empty-result&quot;>Change map could not be loaded.</div>'"
                    >
                    `
                    :
                    `
                    <div class="empty-result">
                        Change map unavailable.
                    </div>
                    `
                }

            </div>


            <div class="change-metrics">

                <div class="metric-card">

                    <span>
                        DETECTED CHANGE
                    </span>

                    <strong>
                        ${percentage.toFixed(2)}%
                    </strong>

                </div>


                <div class="metric-card">

                    <span>
                        METHOD
                    </span>

                    <strong>
                        Visual comparison
                    </strong>

                </div>


                <div class="metric-card">

                    <span>
                        STATUS
                    </span>

                    <strong>
                        COMPLETED
                    </strong>

                </div>

            </div>

        </div>
    `;


    $("imagerySection").innerHTML = `

        <div class="metadata-grid">

            <div>
                <span>
                    PRIMARY IMAGE
                </span>

                <strong>
                    ${esc(beforeFile.name)}
                </strong>
            </div>

            <div>
                <span>
                    COMPARISON IMAGE
                </span>

                <strong>
                    ${esc(afterFile.name)}
                </strong>
            </div>

            <div>
                <span>
                    ANALYSIS
                </span>

                <strong>
                    Normalized RGB
                </strong>
            </div>

            <div>
                <span>
                    SOURCE
                </span>

                <strong>
                    User uploaded imagery
                </strong>
            </div>

        </div>
    `;
}


/* -----------------------------
   RECOMMENDATIONS
----------------------------- */

function renderUploadRecommendation(
    data
) {

    const percentage =
        Number(
            data?.difference
                ?.change_percentage || 0
        );

    let interpretation;

    if (percentage >= 25) {

        interpretation =
            "A substantial visual difference was detected. Review the highlighted regions using higher-resolution imagery and confirm that the images are correctly aligned.";

    } else if (percentage >= 10) {

        interpretation =
            "A moderate visual difference was detected. Further inspection is recommended before assigning a specific geographic cause.";

    } else {

        interpretation =
            "The images show relatively limited pixel-level visual difference under the configured threshold.";
    }


    $("recommendationSection").innerHTML = `

        <div class="recommendation-summary">
            ${esc(interpretation)}
        </div>

        <div class="recommendation-list">

            <div class="recommendation-item">
                <span>01</span>
                <p>
                    Review the highlighted regions against
                    the original imagery.
                </p>
            </div>

            <div class="recommendation-item">
                <span>02</span>
                <p>
                    Verify acquisition dates, cloud
                    conditions and image alignment.
                </p>
            </div>

            <div class="recommendation-item">
                <span>03</span>
                <p>
                    Use domain-specific indices or
                    classification models for higher-confidence
                    land-cover analysis.
                </p>
            </div>

        </div>

        <div class="recommendation-disclaimer">
            Decision-support suggestions only.
            The system does not provide guaranteed conclusions.
        </div>
    `;
}


/* -----------------------------
   NATURAL LANGUAGE ANALYSIS
----------------------------- */

async function sendQuery() {

    const query =
        $("query").value.trim();

    const mode =
        $("analysisMode").value;

    if (!query) {

        showError(
            "Please enter a satellite analysis query."
        );

        return;
    }

    $("errorBox").classList.add(
        "hidden"
    );

    $("results").classList.add(
        "hidden"
    );

    $("pipelineStatus").textContent =
        "PROCESSING";

    try {

        activateStep(1);
        await delay(150);

        activateStep(2);
        await delay(150);

        activateStep(3);

        const response =
            await fetch(
                `${API_BASE}/query`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        query,
                        expertise: "general",
                        mode
                    })
                }
            );

        if (!response.ok) {

            throw new Error(
                `Backend returned HTTP ${response.status}`
            );
        }

        const data =
            await response.json();

        if (!data.success) {

            throw new Error(
                data.error ||
                "Analysis failed."
            );
        }

        activateStep(4);
        await delay(100);

        activateStep(5);
        await delay(100);

        activateStep(6);
        await delay(100);

        activateStep(7);
        await delay(100);

        activateStep(8);

        renderQueryResult(
            data
        );

        $("results").classList.remove(
            "hidden"
        );

        finishPipeline();

        setTimeout(() => {

            $("results")
                .scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

        }, 150);

    } catch (error) {

        console.error(error);

        showError(
            error.message
        );

        $("pipelineStatus").textContent =
            "ERROR";
    }
}


/* -----------------------------
   RESULT RENDERING
----------------------------- */

function renderQueryResult(
    data
) {

    $("resultTitle").textContent =
        formatAnalysisType(
            data.analysis_type
        );


    let confidence =
        data.confidence;

    if (
        typeof confidence ===
        "string"
    ) {

        $("confidence").textContent =
            confidence.toUpperCase() +
            " CONFIDENCE";

    } else {

        $("confidence").textContent =
            confidence !== undefined
                ? `${confidence}% CONFIDENCE`
                : "ANALYSIS COMPLETE";
    }


    $("observation").textContent =
        data.observation ||
        "No observation returned.";


    $("resultText").textContent =
        data.result ||
        "No result returned.";


    renderRequirements(
        data.data_requirements
    );


    renderQuality(
        data.data_quality
    );


    renderSatelliteImagery(
        data.imagery
    );


    renderRecommendations(
        data.recommendations
    );


    renderModel(
        data.model,
        data.limitation
    );
}


function formatAnalysisType(
    type
) {

    if (!type) {
        return "Satellite Intelligence Result";
    }

    return type
        .replaceAll("_", " ")
        .replace(
            /\b\w/g,
            letter =>
                letter.toUpperCase()
        );
}


/* -----------------------------
   DATA REQUIREMENTS
----------------------------- */

function renderRequirements(
    requirements
) {

    const container =
        $("requirements");

    if (!requirements) {

        container.innerHTML =
            `<div class="muted">
                No specific requirements.
            </div>`;

        return;
    }

    if (
        typeof requirements ===
        "string"
    ) {

        container.innerHTML =
            `<div class="quality-text">
                ${esc(requirements)}
            </div>`;

        return;
    }


    container.innerHTML = `
        <div class="metadata-list">

            ${Object.entries(
                requirements
            ).map(
                ([key, value]) => `

                <div class="metadata-line">

                    <span>
                        ${esc(
                            key
                                .replaceAll(
                                    "_",
                                    " "
                                )
                        )}
                    </span>

                    <strong>
                        ${esc(
                            value
                        )}
                    </strong>

                </div>

            `
            ).join("")}

        </div>
    `;
}


/* -----------------------------
   QUALITY
----------------------------- */

function renderQuality(
    quality
) {

    const container =
        $("quality");

    if (!quality) {

        container.innerHTML =
            `<div class="muted">
                No quality information.
            </div>`;

        return;
    }


    if (
        typeof quality ===
        "string"
    ) {

        container.innerHTML =
            `<div class="quality-text">
                ${esc(quality)}
            </div>`;

        return;
    }


    container.innerHTML = `
        <div class="quality-list">

            ${Object.entries(
                quality
            ).map(
                ([key, value]) => `

                <div class="quality-row">

                    <span>
                        ${esc(
                            key
                                .replaceAll(
                                    "_",
                                    " "
                                )
                        )}
                    </span>

                    <strong>
                        ${esc(value)}
                    </strong>

                </div>

            `
            ).join("")}

        </div>
    `;
}


/* -----------------------------
   SATELLITE IMAGERY
----------------------------- */

function renderSatelliteImagery(
    imagery
) {

    if (!imagery) {

        $("comparisonSection")
            .innerHTML = `
                <div class="empty-result">
                    No imagery returned.
                </div>
            `;

        return;
    }


    const before =
        imagery.before;

    const after =
        imagery.after;


    const beforeURL =
        absoluteUrl(
            before?.url
        );

    const afterURL =
        absoluteUrl(
            after?.url
        );


    $("comparisonSection")
        .innerHTML = `

        <div class="uploaded-comparison">

            <div class="uploaded-image">

                <div class="image-label">
                    BEFORE
                    ${
                        before?.date
                        ? " · " +
                          esc(
                              before.date
                          )
                        : ""
                    }
                </div>

                ${
                    beforeURL
                    ?
                    `
                    <img
                        src="${beforeURL}"
                        alt="Before satellite imagery"
                        onerror="this.parentElement.innerHTML='<div class=&quot;empty-result&quot;>Before imagery could not be loaded.</div>'"
                    >
                    `
                    :
                    `
                    <div class="empty-result">
                        Before imagery unavailable.
                    </div>
                    `
                }

            </div>


            <div class="uploaded-image">

                <div class="image-label">
                    AFTER
                    ${
                        after?.date
                        ? " · " +
                          esc(
                              after.date
                          )
                        : ""
                    }
                </div>

                ${
                    afterURL
                    ?
                    `
                    <img
                        src="${afterURL}"
                        alt="After satellite imagery"
                        onerror="this.parentElement.innerHTML='<div class=&quot;empty-result&quot;>After imagery could not be loaded.</div>'"
                    >
                    `
                    :
                    `
                    <div class="empty-result">
                        After imagery unavailable.
                    </div>
                    `
                }

            </div>

        </div>
    `;


    renderChangeMap(
        imagery.difference
    );


    $("imagerySection")
        .innerHTML = `

        <div class="metadata-grid">

            <div>
                <span>SOURCE</span>
                <strong>
                    ${esc(
                        before?.dataset ||
                        "Satellite imagery"
                    )}
                </strong>
            </div>

            <div>
                <span>DATASET</span>
                <strong>
                    ${esc(
                        before?.dataset ||
                        "NASA GIBS"
                    )}
                </strong>
            </div>

            <div>
                <span>RESOLUTION</span>
                <strong>
                    ${esc(
                        before?.resolution ||
                        "Browse imagery"
                    )}
                </strong>
            </div>

            <div>
                <span>AREA</span>
                <strong>
                    ${esc(
                        imagery.area?.name ||
                        "Requested region"
                    )}
                </strong>
            </div>

        </div>
    `;
}


/* -----------------------------
   CHANGE MAP
----------------------------- */

function renderChangeMap(
    difference
) {

    if (!difference) {

        $("changeSection")
            .innerHTML = `
                <div class="empty-result">
                    No change detection result returned.
                </div>
            `;

        return;
    }


    const url =
        absoluteUrl(
            difference.url
        );


    const percentage =
        Number(
            difference.change_percentage ||
            0
        );


    $("changeSection")
        .innerHTML = `

        <div class="change-result">

            <div class="change-image">

                ${
                    url
                    ?
                    `
                    <img
                        src="${url}"
                        alt="Satellite change detection map"
                        onerror="this.parentElement.innerHTML='<div class=&quot;empty-result&quot;>Change map could not be loaded.</div>'"
                    >
                    `
                    :
                    `
                    <div class="empty-result">
                        Change map unavailable.
                    </div>
                    `
                }

            </div>


            <div class="change-metrics">

                <div class="metric-card">

                    <span>
                        DETECTED CHANGE
                    </span>

                    <strong>
                        ${percentage.toFixed(2)}%
                    </strong>

                </div>


                <div class="metric-card">

                    <span>
                        METHOD
                    </span>

                    <strong>
                        ${esc(
                            difference.method ||
                            "Visual comparison"
                        )}
                    </strong>

                </div>

            </div>

        </div>
    `;
}


/* -----------------------------
   RECOMMENDATIONS
----------------------------- */

function renderRecommendations(
    recommendations
) {

    if (!recommendations) {

        $("recommendationSection")
            .innerHTML = `
                <div class="empty-result">
                    No recommendations generated.
                </div>
            `;

        return;
    }


    const actions =
        recommendations.actions ||
        recommendations.recommendations ||
        [];


    const summary =
        recommendations.why_it_matters ||
        recommendations.summary ||
        "";


    $("recommendationSection")
        .innerHTML = `

        ${
            summary
            ?
            `
            <div class="recommendation-summary">
                ${esc(summary)}
            </div>
            `
            :
            ""
        }


        <div class="recommendation-list">

            ${
                Array.isArray(actions)
                ?
                actions.map(
                    (item, index) => {

                        const text =
                            typeof item ===
                            "string"
                            ? item
                            : item.action ||
                              item.text ||
                              JSON.stringify(
                                  item
                              );

                        return `
                            <div class="recommendation-item">

                                <span>
                                    ${String(
                                        index + 1
                                    ).padStart(
                                        2,
                                        "0"
                                    )}
                                </span>

                                <p>
                                    ${esc(text)}
                                </p>

                            </div>
                        `;
                    }
                ).join("")
                :
                ""
            }

        </div>


        <div class="recommendation-disclaimer">
            Recommendations are based on structured
            analysis evidence and are intended for
            decision support. They are not guarantees.
        </div>
    `;
}


/* -----------------------------
   MODEL
----------------------------- */

function renderModel(
    model,
    limitation
) {

    const container =
        $("model");


    if (!model) {

        container.innerHTML =
            `<div class="muted">
                Analysis model unavailable.
            </div>`;

        return;
    }


    if (
        typeof model ===
        "string"
    ) {

        container.innerHTML = `
            <div class="model-display">
                <strong>
                    ${esc(model)}
                </strong>

                <span>
                    ${esc(
                        limitation || ""
                    )}
                </span>
            </div>
        `;

        return;
    }


    container.innerHTML = `
        <div class="model-display">

            <strong>
                ${esc(
                    model.name ||
                    "SatQueryAI Analysis Engine"
                )}
            </strong>

            <span>
                ${esc(
                    model.description ||
                    limitation ||
                    ""
                )}
            </span>

        </div>
    `;
}


/* -----------------------------
   SAMPLE
----------------------------- */

async function trySampleAnalysis() {

    $("query").value =
        "Detect changes around Mumbai between 2021 and 2026";

    $("analysisMode").value =
        "demo";

    await sendQuery();
}


/* -----------------------------
   EXPORTS
----------------------------- */

window.setExample =
    setExample;

window.clearQuery =
    clearQuery;

window.sendQuery =
    sendQuery;

window.trySampleAnalysis =
    trySampleAnalysis;

window.handleFile =
    handleFile;

window.handleDrop =
    handleDrop;

window.handleDragOver =
    handleDragOver;

window.handleDragLeave =
    handleDragLeave;

window.removeFile =
    removeFile;

window.uploadComparison =
    uploadComparison;

window.scrollToSection =
    scrollToSection;
async function sendQuery() {

    const query =
        $("query").value.trim();

    const mode =
        $("analysisMode").value;


    /*
       IMPORTANT:

       If the user has uploaded BOTH images,
       Run Analysis should analyze those images
       directly instead of ignoring them and
       sending a separate /query request.
    */

    if (
        beforeFile &&
        afterFile
    ) {

        await uploadComparison();

        return;
    }


    if (!query) {

        showError(
            "Please enter a satellite analysis query or upload two images."
        );

        return;
    }


    $("errorBox").classList.add(
        "hidden"
    );

    $("results").classList.add(
        "hidden"
    );

    $("pipelineStatus").textContent =
        "PROCESSING";


    try {

        activateStep(1);

        await delay(150);


        activateStep(2);

        await delay(150);


        activateStep(3);


        const response =
            await fetch(
                `${API_BASE}/query`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        query:
                            query,

                        expertise:
                            "general",

                        mode:
                            mode

                    })
                }
            );


        if (!response.ok) {

            let detail =
                `Backend returned HTTP ${response.status}`;

            try {

                const errorData =
                    await response.json();

                if (
                    errorData.error
                ) {

                    detail =
                        errorData.error;

                } else if (
                    errorData.detail
                ) {

                    detail =
                        typeof errorData.detail === "string"
                            ? errorData.detail
                            : JSON.stringify(
                                errorData.detail
                            );
                }

            } catch (_) {
                // Keep HTTP error message.
            }

            throw new Error(
                detail
            );
        }


        const data =
            await response.json();


        if (!data.success) {

            throw new Error(
                data.error ||
                data.detail ||
                "Satellite analysis failed."
            );
        }


        activateStep(4);

        await delay(100);


        activateStep(5);

        await delay(100);


        activateStep(6);

        await delay(100);


        activateStep(7);

        await delay(100);


        activateStep(8);


        renderQueryResult(
            data
        );


        $("results")
            .classList
            .remove("hidden");


        finishPipeline();


        setTimeout(() => {

            $("results")
                .scrollIntoView({
                    behavior:
                        "smooth",

                    block:
                        "start"
                });

        }, 150);


    } catch (error) {

        console.error(
            "SatQueryAI:",
            error
        );


        $("pipelineStatus")
            .textContent =
                "ERROR";


        showError(
            error.message ||
            "Unable to complete satellite analysis."
        );
    }
}
async function uploadComparison() {

    if (!beforeFile) {

        showError(
            "Please upload a primary image."
        );

        return;
    }


    if (!afterFile) {

        showError(
            "Please upload a comparison image."
        );

        return;
    }


    $("errorBox")
        .classList
        .add("hidden");


    $("results")
        .classList
        .remove("hidden");


    $("resultTitle").textContent =
        "Uploaded Image Change Detection";


    $("confidence").textContent =
        "COMPUTED";


    $("pipelineStatus")
        .textContent =
            "UPLOADING";


    activateStep(5);


    /*
       Show the actual uploaded images
       before waiting for backend processing.
    */

    renderUploadedPreview();


    const formData =
        new FormData();


    formData.append(
        "before",
        beforeFile,
        beforeFile.name
    );


    formData.append(
        "after",
        afterFile,
        afterFile.name
    );


    try {

        $("pipelineStatus")
            .textContent =
                "ANALYZING";


        const response =
            await fetch(
                `${API_BASE}/change-detection`,
                {
                    method: "POST",
                    body: formData
                }
            );


        if (!response.ok) {

            let message =
                `Backend returned HTTP ${response.status}`;

            try {

                const errorData =
                    await response.json();

                message =
                    errorData.error ||
                    errorData.detail ||
                    message;

            } catch (_) {}

            throw new Error(
                message
            );
        }


        const data =
            await response.json();


        console.log(
            "Change detection response:",
            data
        );


        if (!data.success) {

            throw new Error(
                data.error ||
                "Change detection failed."
            );
        }


        activateStep(6);


        renderUploadedChange(
            data
        );


        activateStep(7);


        renderUploadRecommendation(
            data
        );


        activateStep(8);


        finishPipeline();


        $("results")
            .scrollIntoView({
                behavior:
                    "smooth",
                block:
                    "start"
            });


    } catch (error) {

        console.error(
            "Change detection:",
            error
        );


        $("pipelineStatus")
            .textContent =
                "ERROR";


        showError(
            error.message ||
            "Unable to analyze uploaded imagery."
        );
    }
}
function activateStep(number) {

    const steps =
        document.querySelectorAll(
            ".pipeline-step"
        );

    steps.forEach(step => {

        const stepNumber =
            Number(
                step.dataset.step
            );

        step.classList.remove(
            "active"
        );

        if (
            stepNumber < number
        ) {

            step.classList.add(
                "done"
            );

        } else {

            step.classList.remove(
                "done"
            );
        }

        if (
            stepNumber === number
        ) {

            step.classList.add(
                "active"
            );
        }

    });


    const status =
        document.getElementById(
            "pipelineStatus"
        );

    if (status) {

        status.textContent =
            `STEP ${String(number).padStart(2, "0")} / 08`;

        status.classList.add(
            "pipeline-status-running"
        );
    }
}


function finishPipeline() {

    document
        .querySelectorAll(
            ".pipeline-step"
        )
        .forEach(step => {

            step.classList.remove(
                "active"
            );

            step.classList.add(
                "done"
            );

        });


    const status =
        document.getElementById(
            "pipelineStatus"
        );

    if (status) {

        status.textContent =
            "ANALYSIS COMPLETE";

        status.classList.remove(
            "pipeline-status-running"
        );
    }
}


function pipelineError() {

    document
        .querySelectorAll(
            ".pipeline-step"
        )
        .forEach(step => {

            step.classList.remove(
                "active"
            );

        });


    const status =
        document.getElementById(
            "pipelineStatus"
        );

    if (status) {

        status.textContent =
            "ANALYSIS ERROR";

        status.classList.remove(
            "pipeline-status-running"
        );
    }
}
/* ============================================================
   LIVE PIPELINE ANIMATION
============================================================ */

let pipelineTimer = null;
let pipelineRunning = false;


function startPipelineAnimation() {

    pipelineRunning = true;

    const steps =
        Array.from(
            document.querySelectorAll(
                ".pipeline-step"
            )
        );

    if (!steps.length) {
        return;
    }

    steps.forEach(step => {

        step.classList.remove(
            "active",
            "done"
        );

    });


    let current = 0;


    function move() {

        if (!pipelineRunning) {
            return;
        }


        steps.forEach(
            (step, index) => {

                step.classList.remove(
                    "active"
                );

                if (
                    index < current
                ) {

                    step.classList.add(
                        "done"
                    );

                } else {

                    step.classList.remove(
                        "done"
                    );
                }

            }
        );


        if (
            steps[current]
        ) {

            steps[current]
                .classList
                .add("active");

        }


        const status =
            document.getElementById(
                "pipelineStatus"
            );


        if (status) {

            status.textContent =
                `PROCESSING · STEP ${String(
                    current + 1
                ).padStart(2, "0")} / 08`;

            status.classList.add(
                "pipeline-status-running"
            );
        }


        /*
           Keep each step visible long enough
           for the user to understand what is
           happening.
        */

        const durations = [

            900,   // Query

            1100,  // Requirements

            3000,  // Retrieval

            1400,  // Quality

            2200,  // Analysis

            2200,  // Change

            1800,  // Recommendations

            1500   // Result

        ];


        pipelineTimer =
            setTimeout(
                () => {

                    if (
                        current <
                        steps.length - 1
                    ) {

                        current++;

                        move();

                    }

                },
                durations[
                    current
                ] || 1200
            );
    }


    move();
}


function stopPipelineAnimation(
    success = true
) {

    pipelineRunning = false;


    if (pipelineTimer) {

        clearTimeout(
            pipelineTimer
        );

        pipelineTimer = null;
    }


    const steps =
        document.querySelectorAll(
            ".pipeline-step"
        );


    steps.forEach(step => {

        step.classList.remove(
            "active"
        );

        if (success) {

            step.classList.add(
                "done"
            );

        } else {

            step.classList.remove(
                "done"
            );
        }

    });


    const status =
        document.getElementById(
            "pipelineStatus"
        );


    if (status) {

        status.classList.remove(
            "pipeline-status-running"
        );

        status.textContent =
            success
                ? "ANALYSIS COMPLETE"
                : "ANALYSIS ERROR";
    }
}
async function sendQuery() {

    const query =
        $("query").value.trim();


    const mode =
        $("analysisMode")
            ? $("analysisMode").value
            : "auto";


    /*
       If both images are uploaded,
       analyze them directly.
    */

    if (
        beforeFile &&
        afterFile
    ) {

        await uploadComparison();

        return;
    }


    if (!query) {

        showError(
            "Please enter a satellite analysis query or upload two images."
        );

        return;
    }


    $("errorBox")
        .classList
        .add("hidden");


    $("results")
        .classList
        .add("hidden");


    /*
       START THE LIVE ANIMATION
       BEFORE making the network request.
    */

    startPipelineAnimation();


    try {

        const response =
            await fetch(
                `${API_BASE}/query`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        query:
                            query,

                        expertise:
                            "general",

                        mode:
                            mode

                    })
                }
            );


        if (!response.ok) {

            throw new Error(
                `Backend returned HTTP ${response.status}`
            );
        }


        const data =
            await response.json();


        console.log(
            "SatQueryAI response:",
            data
        );


        if (!data.success) {

            throw new Error(
                data.error ||
                data.detail ||
                "Satellite analysis failed."
            );
        }


        /*
           Render everything only after
           the backend has completed.
        */

        renderQueryResult(
            data
        );


        $("results")
            .classList
            .remove("hidden");


        stopPipelineAnimation(
            true
        );


        setTimeout(() => {

            $("results")
                .scrollIntoView({
                    behavior:
                        "smooth",

                    block:
                        "start"
                });

        }, 200);


    } catch (error) {

        console.error(
            "SatQueryAI request failed:",
            error
        );


        stopPipelineAnimation(
            false
        );


        showError(
            error.message ||
            "Unable to connect to SatQueryAI backend."
        );
    }
}
async function uploadComparison() {

    if (!beforeFile) {

        showError(
            "Please upload a primary image."
        );

        return;
    }


    if (!afterFile) {

        showError(
            "Please upload a comparison image."
        );

        return;
    }


    $("errorBox")
        .classList
        .add("hidden");


    $("results")
        .classList
        .remove("hidden");


    $("resultTitle").textContent =
        "Uploaded Image Change Detection";


    $("confidence").textContent =
        "PROCESSING";


    /*
       Show images immediately.
    */

    renderUploadedPreview();


    /*
       Start live pipeline animation.
    */

    startPipelineAnimation();


    const formData =
        new FormData();


    formData.append(
        "before",
        beforeFile,
        beforeFile.name
    );


    formData.append(
        "after",
        afterFile,
        afterFile.name
    );


    try {

        const response =
            await fetch(
                `${API_BASE}/change-detection`,
                {
                    method: "POST",
                    body: formData
                }
            );


        if (!response.ok) {

            throw new Error(
                `Backend returned HTTP ${response.status}`
            );
        }


        const data =
            await response.json();


        console.log(
            "Uploaded imagery response:",
            data
        );


        if (!data.success) {

            throw new Error(
                data.error ||
                data.detail ||
                "Change detection failed."
            );
        }


        renderUploadedChange(
            data
        );


        renderUploadRecommendation(
            data
        );


        stopPipelineAnimation(
            true
        );


    } catch (error) {

        console.error(
            "Uploaded imagery request failed:",
            error
        );


        stopPipelineAnimation(
            false
        );


        showError(
            error.message ||
            "Unable to connect to the SatQueryAI backend."
        );
    }
}

// File: scripts/app.js

document.addEventListener("DOMContentLoaded", () => {
  /* -----------------------------------
     1. Tham chiếu DOM & biến toàn cục
  ----------------------------------- */
  const relationSelect = document.getElementById("filter-relation");
  const typeSelect     = document.getElementById("filter-qqtype");
  const vidSelect      = document.getElementById("filter-vid");
  const videoContainer = document.getElementById("video-container");
  const paginationContainer = document.getElementById("pagination");

  const itemsPerPage = 20;  // 20 video/card mỗi trang
  let currentPage = 1;      // Trang hiện tại (1-based)

  let dataset = [];         // Mảng chứa toàn bộ record JSON
  let uniqueRelations   = new Set();
  let uniqueQuestionTypes = new Set();
  let uniqueVideoPrefixes = new Set();

  /* -----------------------------------
     2. Hàm bóc YouTube prefix từ video_name
     Ví dụ: "06GyG4-wONQ_000006" -> "06GyG4-wONQ"
  ----------------------------------- */
  function extractYoutubePrefix(videoName) {
    if (typeof videoName !== "string" || videoName.length <= 7) {
        return "";
    }
    // Bỏ 7 ký tự cuối ("_000006", gồm "_" + 6 số)
    return videoName.slice(0, videoName.length - 7);
  }
  /* -----------------------------------
     3. Hàm tạo một video‐card
     (iframe + metadata: relation, type, question, options, answer)
  ----------------------------------- */
  function createVideoCard(record) {
    const card = document.createElement("div");
    card.classList.add("video-card");

    // 3.1. Phần media: iframe YouTube
    const ytPrefix = extractYoutubePrefix(record.video_name);
    const iframe = document.createElement("iframe");
    iframe.width = "100%";
    iframe.height = "150";
    iframe.src = `https://www.youtube.com/embed/${ytPrefix}`;
    iframe.frameBorder = "0";
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;
    card.appendChild(iframe);

    // 3.2. Phần metadata
    const metaDiv = document.createElement("div");
    metaDiv.classList.add("video-metadata");

    // question_relation
    if (record.question_relation) {
      const pRel = document.createElement("p");
      pRel.innerHTML = `<span class="meta-label">Relation:</span> ${record.question_relation}`;
      metaDiv.appendChild(pRel);
    }

    // question_type
    if (record.question_type) {
      const pType = document.createElement("p");
      pType.innerHTML = `<span class="meta-label">Type:</span> ${record.question_type}`;
      metaDiv.appendChild(pType);
    }

    // question_text
    if (record.question_text) {
      const pQ = document.createElement("p");
      pQ.innerHTML = `<span class="meta-label">Question:</span> ${record.question_text}`;
      metaDiv.appendChild(pQ);
    }

    // multi_choice (mảng string)
    if (Array.isArray(record.multi_choice) && record.multi_choice.length > 0) {
      const pLabel = document.createElement("p");
      pLabel.innerHTML = `<span class="meta-label">Options:</span>`;
      metaDiv.appendChild(pLabel);

      const ul = document.createElement("ul");
      ul.style.paddingLeft = "1.2rem";
      ul.style.marginTop = "-0.3rem";
      record.multi_choice.forEach(opt => {
        const li = document.createElement("li");
        li.textContent = opt.trim();
        li.style.fontSize = "0.9rem";
        li.style.marginBottom = "0.2rem";
        ul.appendChild(li);
      });
      metaDiv.appendChild(ul);
    }

    // answer (số index)
    if (typeof record.answer === "number") {
      const idx = record.answer;
      let answerText = "";
      if (
        Array.isArray(record.multi_choice) &&
        idx >= 0 &&
        idx < record.multi_choice.length
      ) {
        answerText = record.multi_choice[idx];
      } else {
        answerText = record.answer.toString();
      }
      const pAns = document.createElement("p");
      pAns.innerHTML = `<span class="meta-label">Answer:</span> ${answerText}`;
      metaDiv.appendChild(pAns);
    }

    card.appendChild(metaDiv);
    return card;
  }

  /* -----------------------------------
     4. Hàm đổ dropdown filter
  ----------------------------------- */
  function initFilters() {
    // Reset về “All”
    relationSelect.innerHTML = '<option value="">-- All --</option>';
    typeSelect.innerHTML     = '<option value="">-- All --</option>';
    vidSelect.innerHTML      = '<option value="">-- All --</option>';

    // 4.1. Đổ question_relation
    Array.from(uniqueRelations).sort().forEach(rel => {
      const opt = document.createElement("option");
      opt.value = rel;
      opt.textContent = rel;
      relationSelect.appendChild(opt);
    });

    // 4.2. Đổ question_type
    Array.from(uniqueQuestionTypes).sort().forEach(qq => {
      const opt = document.createElement("option");
      opt.value = qq;
      opt.textContent = qq;
      typeSelect.appendChild(opt);
    });

    // 4.3. Đổ video_prefix
    Array.from(uniqueVideoPrefixes).sort().forEach(vp => {
      const opt = document.createElement("option");
      opt.value = vp;
      opt.textContent = vp;
      vidSelect.appendChild(opt);
    });
  }

  /* -----------------------------------
     5. Hàm renderCards() với joint filtering & pagination
  ----------------------------------- */
  function renderCards() {
    videoContainer.innerHTML = "";        // Xóa hết card cũ
    paginationContainer.innerHTML = "";   // Xóa hết pagination cũ

    // 5.1. Lấy giá trị filter hiện tại
    const selRel  = relationSelect.value;
    const selType = typeSelect.value;
    const selVid  = vidSelect.value;

    // 5.2. Lọc dataset theo cả 3 điều kiện
    const filtered = dataset.filter(rec => {
      const okRel  = selRel  === "" || rec.question_relation === selRel;
      const okType = selType === "" || rec.question_type === selType;
      const prefix = extractYoutubePrefix(rec.video_name);
      const okVid  = selVid === "" || prefix === selVid;
      return okRel && okType && okVid;
    });

    // 5.3. Nếu không có kết quả, show thông báo
    if (filtered.length === 0) {
      videoContainer.innerHTML = "<p>No records match your filters.</p>";
      return;
    }

    // 5.4. Pagination: tính total pages
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // 5.5. Điều chỉnh currentPage nếu vượt giới hạn
    if (currentPage > totalPages && totalPages > 0) {
      currentPage = totalPages;
    }
    if (currentPage < 1) {
      currentPage = 1;
    }

    // 5.6. Tính slice cho page hiện tại
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageItems = filtered.slice(startIndex, endIndex);

    // 5.7. Render từng card (20 item)
    pageItems.forEach(rec => {
      const card = createVideoCard(rec);
      videoContainer.appendChild(card);
    });

    // 5.8. Render pagination (ellipsis)
    renderPagination(totalItems, totalPages);
  }

  /* -----------------------------------
     6. Hàm renderPagination() với ellipsis
  ----------------------------------- */
  function renderPagination(totalItems, totalPages) {
    if (totalPages <= 1) return;

    // 6.1. Nút "‹" (Prev)
    const prevBtn = document.createElement("button");
    prevBtn.innerHTML = "‹";  
    prevBtn.classList.add("arrow", "prev-arrow");
    prevBtn.disabled = (currentPage === 1);
    prevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderCards();
      }
    });
    paginationContainer.appendChild(prevBtn);

    // 6.2. Luôn hiển thị nút "1"
    createPageButton(1);

    // 6.3. Ellipsis nếu cần
    if (currentPage - 3 > 1) {
      createEllipsis();
    }

    // 6.4. Nhóm pages xung quanh currentPage
    const startGroup = Math.max(2, currentPage - 2);
    const endGroup   = Math.min(totalPages - 1, currentPage + 2);
    for (let page = startGroup; page <= endGroup; page++) {
      createPageButton(page);
    }

    // 6.5. Ellipsis nếu cần
    if (currentPage + 3 < totalPages) {
      createEllipsis();
    }

    // 6.6. Luôn hiển thị nút trang cuối
    createPageButton(totalPages);

    // 6.7. Nút "›" (Next)
    const nextBtn = document.createElement("button");
    nextBtn.innerHTML = "›";
    nextBtn.classList.add("arrow", "next-arrow");
    nextBtn.disabled = (currentPage === totalPages);
    nextBtn.addEventListener("click", () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderCards();
      }
    });
    paginationContainer.appendChild(nextBtn);

    // ----- Các hàm phụ trợ -----
    function createPageButton(page) {
      const btn = document.createElement("button");
      btn.textContent = page;
      if (page === currentPage) {
        btn.classList.add("active");
      }
      btn.addEventListener("click", () => {
        if (page !== currentPage) {
          currentPage = page;
          renderCards();
        }
      });
      paginationContainer.appendChild(btn);
    }

    function createEllipsis() {
      const span = document.createElement("span");
      span.textContent = "…";
      span.style.padding = "0 0.5rem";
      span.style.fontSize = "1.1rem";
      span.style.color = "#666";
      paginationContainer.appendChild(span);
    }
  }

  /* -----------------------------------
     7. Event listeners cho filters
  ----------------------------------- */
  relationSelect.addEventListener("change", () => {
    currentPage = 1;
    renderCards();
  });
  typeSelect.addEventListener("change", () => {
    currentPage = 1;
    renderCards();
  });
  vidSelect.addEventListener("change", () => {
    currentPage = 1;
    renderCards();
  });

  /* -----------------------------------
     8. Fetch JSON & khởi tạo lần đầu
     (DÙNG val_qa.json)
  ----------------------------------- */
  fetch("data/val_qa.json")
    .then(response => {
      if (!response.ok) throw new Error("Cannot fetch JSON");
      return response.json();
    })
    .then(records => {
      if (!Array.isArray(records)) {
        console.error("Expected an array of records", records);
        videoContainer.innerHTML = `<p style="color:red;">Dataset format is invalid.</p>`;
        return;
      }

      // 8.1. Gán dataset
      dataset = records;

      // 8.2. Thu collection cho các dropdown
      dataset.forEach(rec => {
        if (rec.question_relation) {
          uniqueRelations.add(rec.question_relation);
        }
        if (rec.question_type) {
          uniqueQuestionTypes.add(rec.question_type);
        }
        const ytP = extractYoutubePrefix(rec.video_name);
        if (ytP) uniqueVideoPrefixes.add(ytP);
      });

      // 8.3. Khởi tạo dropdown filter
      initFilters();

      // 8.4. Render lần đầu (chưa filter gì)
      renderCards();
    })
    .catch(err => {
      console.error("Error fetching JSON:", err);
      videoContainer.innerHTML = `<p style="color:red;">Failed to load dataset.</p>`;
    });
});

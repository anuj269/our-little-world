/* =========================================================
   OUR LITTLE WORLD
   Supabase-powered memory website
   ========================================================= */


/* =========================================================
   SUPABASE DATABASE SETUP

   BEFORE USING THE WEBSITE:

   1. Open Supabase
   2. Open SQL Editor
   3. Create a New Query
   4. Copy the SQL below
   5. Remove the "//" from the beginning of each SQL line
      OR copy the SQL directly from these comments.

   ---------------------------------------------------------

   create table public.memories (
     id uuid primary key default gen_random_uuid(),
     title text not null,
     description text default '',
     memory_date date not null,
     category text not null default 'everyday',
     media_type text not null default 'image',
     media_url text not null,
     is_special boolean not null default false,
     created_at timestamp with time zone default now()
   );

   alter table public.memories enable row level security;

   create policy "Anyone can view memories"
   on public.memories
   for select
   to anon, authenticated
   using (true);

   create policy "Authenticated users can add memories"
   on public.memories
   for insert
   to authenticated
   with check (true);

   create policy "Authenticated users can edit memories"
   on public.memories
   for update
   to authenticated
   using (true)
   with check (true);

   create policy "Authenticated users can delete memories"
   on public.memories
   for delete
   to authenticated
   using (true);

   grant select on public.memories to anon;
   grant select, insert, update, delete
   on public.memories
   to authenticated;

   ---------------------------------------------------------

   STORAGE SETUP

   Create a PUBLIC bucket named:

   memories

   Then go to:

   Storage → Policies

   Create policies allowing authenticated users to:

   INSERT
   UPDATE
   DELETE

   files in the "memories" bucket.

   Public visitors only need to READ the files because
   the bucket is public.

   ========================================================= */


/* =========================================================
   SUPABASE CONFIGURATION
   ========================================================= */

/*
   IMPORTANT:

   Replace the two values below.

   You can find them in:

   Supabase
   → Project Settings
   → API

   Use:

   Project URL
   Publishable key

   DO NOT put your database password or service-role key here.
*/

const SUPABASE_URL = "https://oxdqsrjyaydsddznldzj.supabase.co";

const SUPABASE_KEY = "sb_publishable_POIp_yHOccVW9kF5RpAmFA_yAGkVPal";


/* Create Supabase client */

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


/* =========================================================
   GLOBAL VARIABLES
   ========================================================= */

let memories = [];

let currentFilter = "all";

let editingMemoryId = null;


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const memoryGrid =
  document.getElementById("memoryGrid");

const specialGrid =
  document.getElementById("specialGrid");

const adminButton =
  document.getElementById("adminButton");

const adminPanel =
  document.getElementById("adminPanel");

const adminOverlay =
  document.getElementById("adminOverlay");

const closeAdmin =
  document.getElementById("closeAdmin");

const loginArea =
  document.getElementById("loginArea");

const dashboardArea =
  document.getElementById("dashboardArea");

const loginForm =
  document.getElementById("loginForm");

const loginMessage =
  document.getElementById("loginMessage");

const logoutButton =
  document.getElementById("logoutButton");

const adminEmailDisplay =
  document.getElementById("adminEmailDisplay");

const memoryForm =
  document.getElementById("memoryForm");

const memoryMessage =
  document.getElementById("memoryMessage");

const memoryId =
  document.getElementById("memoryId");

const memoryTitle =
  document.getElementById("memoryTitle");

const memoryDate =
  document.getElementById("memoryDate");

const memoryCategory =
  document.getElementById("memoryCategory");

const memoryType =
  document.getElementById("memoryType");

const memoryFile =
  document.getElementById("memoryFile");

const memoryDescription =
  document.getElementById("memoryDescription");

const memorySpecial =
  document.getElementById("memorySpecial");

const saveMemoryButton =
  document.getElementById("saveMemoryButton");

const formTitle =
  document.getElementById("formTitle");

const cancelEdit =
  document.getElementById("cancelEdit");

const adminMemoryList =
  document.getElementById("adminMemoryList");

const lightbox =
  document.getElementById("lightbox");

const lightboxContent =
  document.getElementById("lightboxContent");

const closeLightbox =
  document.getElementById("closeLightbox");

const memoryModal =
  document.getElementById("memoryModal");

const memoryModalContent =
  document.getElementById("memoryModalContent");

const closeMemoryModal =
  document.getElementById("closeMemoryModal");

const backgroundMusic =
  document.getElementById("backgroundMusic");

const musicButton =
  document.getElementById("musicButton");


/* =========================================================
   ADMIN PANEL
   ========================================================= */

function openAdmin() {

  adminPanel.classList.add("open");

  adminOverlay.classList.remove("hidden");

}


function closeAdminPanel() {

  adminPanel.classList.remove("open");

  adminOverlay.classList.add("hidden");

}


adminButton.addEventListener(
  "click",
  openAdmin
);


closeAdmin.addEventListener(
  "click",
  closeAdminPanel
);


adminOverlay.addEventListener(
  "click",
  closeAdminPanel
);


/* =========================================================
   AUTHENTICATION
   ========================================================= */

async function checkLogin() {

  const {
    data,
    error
  } = await supabaseClient.auth.getSession();


  if (error) {

    console.error(error);

    return;

  }


  if (data.session) {

    showDashboard(
      data.session.user
    );

  } else {

    showLogin();

  }

}


function showLogin() {

  loginArea.classList.remove("hidden");

  dashboardArea.classList.add("hidden");

}


function showDashboard(user) {

  loginArea.classList.add("hidden");

  dashboardArea.classList.remove("hidden");

  adminEmailDisplay.textContent =
    user.email || "Administrator";

  loadMemories();

}


loginForm.addEventListener(
  "submit",
  async function(event) {

    event.preventDefault();

    loginMessage.textContent =
      "Signing in...";


    const email =
      document.getElementById(
        "loginEmail"
      ).value.trim();


    const password =
      document.getElementById(
        "loginPassword"
      ).value;


    const {
      data,
      error
    } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });


    if (error) {

      loginMessage.textContent =
        error.message;

      return;

    }


    loginMessage.textContent = "";

    showDashboard(
      data.user
    );

  }
);


logoutButton.addEventListener(
  "click",
  async function() {

    await supabaseClient.auth.signOut();

    showLogin();

  }
);


/* Listen for login/logout changes */

supabaseClient.auth.onAuthStateChange(
  function(event, session) {

    if (session) {

      showDashboard(
        session.user
      );

    } else {

      showLogin();

    }

  }
);


/* =========================================================
   LOAD MEMORIES
   ========================================================= */

async function loadMemories() {

  memoryGrid.innerHTML =
    `<div class="loading">
      Loading memories...
    </div>`;


  const {
    data,
    error
  } =
    await supabaseClient
      .from("memories")
      .select("*")
      .order(
        "memory_date",
        {
          ascending: false
        }
      );


  if (error) {

    console.error(error);

    memoryGrid.innerHTML =
      `<div class="loading">
        Could not load memories.
        Check your Supabase configuration.
      </div>`;

    return;

  }


  memories = data || [];

  renderMemories();

  renderSpecialMemories();

  renderAdminMemories();

}


/* =========================================================
   FILTERING
   ========================================================= */

document
  .querySelectorAll(".filter-button")
  .forEach(function(button) {

    button.addEventListener(
      "click",
      function() {

        document
          .querySelectorAll(".filter-button")
          .forEach(function(btn) {

            btn.classList.remove(
              "active"
            );

          });


        button.classList.add(
          "active"
        );


        currentFilter =
          button.dataset.filter;


        renderMemories();

      }
    );

  });


function getFilteredMemories() {

  if (currentFilter === "all") {

    return memories;

  }


  if (currentFilter === "special") {

    return memories.filter(
      memory => memory.is_special
    );

  }


  return memories.filter(
    memory =>
      memory.category ===
      currentFilter
  );

}


/* =========================================================
   RENDER PUBLIC MEMORIES
   ========================================================= */

function renderMemories() {

  const filtered =
    getFilteredMemories();


  if (!filtered.length) {

    memoryGrid.innerHTML =
      `<div class="loading">
        No memories here yet.
      </div>`;

    return;

  }


  memoryGrid.innerHTML =
    filtered
      .map(
        memory =>
          createMemoryCard(
            memory
          )
      )
      .join("");


  attachMemoryEvents();

}


/* =========================================================
   CREATE MEMORY CARD
   ========================================================= */
function createMemoryCard(memory) {

  const special =
    memory.is_special
      ? `<div class="special-badge">
          SPECIAL
         </div>`
      : "";

  const media =
    createMedia(
      memory,
      "card-media"
    );

  return `
    <article
      class="memory-card"
      data-id="${memory.id}"
    >

      ${media}

      ${special}

      <div class="memory-overlay">

        <div class="memory-title">
          ${escapeHTML(memory.title)}
        </div>

        <div class="memory-date">
          ${formatDate(memory.memory_date)}
        </div>

        ${
          memory.description
            ? `<div class="memory-description">
                ${escapeHTML(memory.description)}
               </div>`
            : ""
        }

      </div>

    </article>
  `;

}

/* =========================================================
   SPECIAL MEMORIES
   ========================================================= */

function renderSpecialMemories() {

  const special =
    memories.filter(
      memory => memory.is_special
    );


  if (!special.length) {

    specialGrid.innerHTML =
      `<div class="loading">
        Your special moments will appear here.
      </div>`;

    return;

  }


  specialGrid.innerHTML =
    special
      .map(
        memory =>
          `
          <article
            class="special-card"
            data-id="${memory.id}"
          >

            ${createMedia(
              memory,
              "special-media"
            )}

            <div class="special-content">

              <p class="eyebrow">
                ${formatDate(memory.memory_date)}
              </p>

              <h3>
                ${escapeHTML(memory.title)}
              </h3>

            </div>

          </article>
          `
      )
      .join("");


  document
    .querySelectorAll(".special-card")
    .forEach(function(card) {

      card.addEventListener(
        "click",
        function() {

          openMemoryModal(
            card.dataset.id
          );

        }
      );

    });

}


/* =========================================================
   MEDIA
   ========================================================= */

function createMedia(
  memory,
  className
) {

  if (memory.media_type === "video") {

    return `
      <video
        class="${className}"
        src="${escapeAttribute(memory.media_url)}"
        muted
        playsinline
        preload="metadata"
      ></video>
    `;

  }


  return `
    <img
      class="${className}"
      src="${escapeAttribute(memory.media_url)}"
      alt="${escapeAttribute(memory.title)}"
      loading="lazy"
    >
  `;

}


/* =========================================================
   PUBLIC CARD EVENTS
   ========================================================= */

function attachMemoryEvents() {

  document
    .querySelectorAll(".memory-card")
    .forEach(function(card) {

      card.addEventListener(
        "click",
        function() {

          const id =
            card.dataset.id;


          const memory =
            memories.find(
              item =>
                item.id === id
            );


          if (!memory) return;


          if (
            memory.media_type ===
            "image"
          ) {

            openLightbox(
              memory.media_url
            );

          } else {

            openMemoryModal(id);

          }

        }
      );

    });

}


/* =========================================================
   LIGHTBOX
   ========================================================= */

function openLightbox(url) {

  lightboxContent.innerHTML =
    `
      <img
        src="${escapeAttribute(url)}"
        alt="Memory"
      >
    `;


  lightbox.classList.remove(
    "hidden"
  );

}


closeLightbox.addEventListener(
  "click",
  function() {

    lightbox.classList.add(
      "hidden"
    );

    lightboxContent.innerHTML = "";

  }
);


/* =========================================================
   MEMORY MODAL
   ========================================================= */

function openMemoryModal(id) {

  const memory =
    memories.find(
      item =>
        item.id === id
    );


  if (!memory) return;


  const media =
    memory.media_type === "video"

      ? `
        <video
          src="${escapeAttribute(memory.media_url)}"
          controls
          playsinline
          class="modal-media"
        ></video>
      `

      : `
        <img
          src="${escapeAttribute(memory.media_url)}"
          alt="${escapeAttribute(memory.title)}"
        >
      `;


  memoryModalContent.innerHTML =
    `
      <div class="memory-modal-media">

        ${media}

      </div>

      <div class="memory-modal-text">

        <p class="eyebrow">
          ${formatDate(memory.memory_date)}
        </p>

        <h2>
          ${escapeHTML(memory.title)}
        </h2>

        <p>
          ${escapeHTML(
            memory.description ||
            "A memory worth keeping."
          )}
        </p>

      </div>
    `;


  memoryModal.classList.remove(
    "hidden"
  );

}


closeMemoryModal.addEventListener(
  "click",
  function() {

    memoryModal.classList.add(
      "hidden"
    );

  }
);


/* =========================================================
   ADMIN MEMORY LIST
   ========================================================= */

function renderAdminMemories() {

  if (!memories.length) {

    adminMemoryList.innerHTML =
      `<p class="loading">
        No memories yet.
      </p>`;

    return;

  }


  adminMemoryList.innerHTML =
    memories
      .map(
        memory =>
          `
          <div
            class="admin-memory"
            data-admin-id="${memory.id}"
          >

            <img
              src="${escapeAttribute(memory.media_url)}"
              alt=""
            >

            <div class="admin-memory-info">

              <strong>
                ${escapeHTML(memory.title)}
              </strong>

              <small>
                ${formatDate(memory.memory_date)}
              </small>

            </div>

            <div class="admin-memory-actions">

              <button
                class="small-button edit-memory"
                data-id="${memory.id}"
              >
                Edit
              </button>

              <button
                class="small-button delete delete-memory"
                data-id="${memory.id}"
              >
                Delete
              </button>

            </div>

          </div>
          `
      )
      .join("");


  document
    .querySelectorAll(".edit-memory")
    .forEach(function(button) {

      button.addEventListener(
        "click",
        function() {

          editMemory(
            button.dataset.id
          );

        }
      );

    });


  document
    .querySelectorAll(".delete-memory")
    .forEach(function(button) {

      button.addEventListener(
        "click",
        function() {

          deleteMemory(
            button.dataset.id
          );

        }
      );

    });

}


/* =========================================================
   ADD / EDIT MEMORY
   ========================================================= */

memoryForm.addEventListener(
  "submit",
  async function(event) {

    event.preventDefault();


    const title =
      memoryTitle.value.trim();


    const date =
      memoryDate.value;


    const category =
      memoryCategory.value;


    const type =
      memoryType.value;


    const description =
      memoryDescription.value.trim();


    const isSpecial =
      memorySpecial.checked;


    const file =
      memoryFile.files[0];


    if (!editingMemoryId && !file) {

      memoryMessage.textContent =
        "Please choose a photo or video.";

      return;

    }


    saveMemoryButton.disabled = true;

    saveMemoryButton.textContent =
      "Saving...";


    try {

      let mediaUrl = "";


      /*
        EDITING

        If no new file is selected,
        keep the old media.
      */

      if (editingMemoryId && !file) {

        const existing =
          memories.find(
            memory =>
              memory.id ===
              editingMemoryId
          );

        mediaUrl =
          existing.media_url;

      }


      /*
        NEW FILE

        Upload the selected file
        to Supabase Storage.
      */

      if (file) {

        const fileExtension =
          file.name
            .split(".")
            .pop()
            .toLowerCase();


        const folder =
          type === "video"
            ? "videos"
            : "images";


        const fileName =
          `${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;


        const filePath =
          `${folder}/${fileName}`;


        const {
          error: uploadError
        } =
          await supabaseClient
            .storage
            .from("memories")
            .upload(
              filePath,
              file,
              {
                cacheControl: "3600",
                upsert: false
              }
            );


        if (uploadError) {

          throw uploadError;

        }


        const {
          data: publicData
        } =
          supabaseClient
            .storage
            .from("memories")
            .getPublicUrl(
              filePath
            );


        mediaUrl =
          publicData.publicUrl;

      }


      /*
        EDIT EXISTING
      */

      if (editingMemoryId) {

        const {
          error
        } =
          await supabaseClient
            .from("memories")
            .update({

              title,

              description,

              memory_date:
                date,

              category,

              media_type:
                type,

              media_url:
                mediaUrl,

              is_special:
                isSpecial

            })
            .eq(
              "id",
              editingMemoryId
            );


        if (error) {

          throw error;

        }


        memoryMessage.textContent =
          "Memory updated successfully.";

      }


      /*
        ADD NEW
      */

      else {

        const {
          error
        } =
          await supabaseClient
            .from("memories")
            .insert({

              title,

              description,

              memory_date:
                date,

              category,

              media_type:
                type,

              media_url:
                mediaUrl,

              is_special:
                isSpecial

            });


        if (error) {

          throw error;

        }


        memoryMessage.textContent =
          "Memory added successfully.";

      }


      resetMemoryForm();

      await loadMemories();

    }

    catch (error) {

      console.error(error);

      memoryMessage.textContent =
        error.message ||
        "Something went wrong.";

    }


    finally {

      saveMemoryButton.disabled = false;

      saveMemoryButton.textContent =
        editingMemoryId
          ? "Update Memory"
          : "Save Memory";

    }

  }
);


/* =========================================================
   EDIT MEMORY
   ========================================================= */

function editMemory(id) {

  const memory =
    memories.find(
      item =>
        item.id === id
    );


  if (!memory) return;


  editingMemoryId = id;


  memoryId.value =
    memory.id;


  memoryTitle.value =
    memory.title;


  memoryDate.value =
    memory.memory_date;


  memoryCategory.value =
    memory.category;


  memoryType.value =
    memory.media_type;


  memoryDescription.value =
    memory.description || "";


  memorySpecial.checked =
    memory.is_special;


  memoryFile.required =
    false;


  formTitle.textContent =
    "Edit Memory";


  saveMemoryButton.textContent =
    "Update Memory";


  cancelEdit.classList.remove(
    "hidden"
  );


  memoryMessage.textContent =
    "Editing this memory. Choose a new file only if you want to replace the current one.";

}


cancelEdit.addEventListener(
  "click",
  resetMemoryForm
);


/* =========================================================
   RESET FORM
   ========================================================= */

function resetMemoryForm() {

  editingMemoryId = null;

  memoryForm.reset();

  memoryId.value = "";

  memoryFile.required = true;

  formTitle.textContent =
    "Add Memory";

  saveMemoryButton.textContent =
    "Save Memory";

  cancelEdit.classList.add(
    "hidden"
  );

}


/* =========================================================
   DELETE MEMORY
   ========================================================= */

async function deleteMemory(id) {

  const memory =
    memories.find(
      item =>
        item.id === id
    );


  if (!memory) return;


  const confirmed =
    confirm(
      `Delete "${memory.title}"?\n\nThis cannot be undone.`
    );


  if (!confirmed) return;


  try {

    /*
      Delete database record.
    */

    const {
      error
    } =
      await supabaseClient
        .from("memories")
        .delete()
        .eq(
          "id",
          id
        );


    if (error) {

      throw error;

    }


    /*
      Try to remove the uploaded file
      from Storage too.
    */

    const storagePath =
      getStoragePath(
        memory.media_url
      );


    if (storagePath) {

      await supabaseClient
        .storage
        .from("memories")
        .remove([
          storagePath
        ]);

    }


    await loadMemories();

  }

  catch (error) {

    console.error(error);

    alert(
      error.message
    );

  }

}


/* =========================================================
   STORAGE PATH HELPER
   ========================================================= */

function getStoragePath(url) {

  if (!url) return null;


  const marker =
    "/storage/v1/object/public/memories/";


  const index =
    url.indexOf(marker);


  if (index === -1) {

    return null;

  }


  return url.substring(
    index + marker.length
  );

}


/* =========================================================
   DATE
   ========================================================= */

function formatDate(date) {

  if (!date) return "";


  return new Date(
    date + "T00:00:00"
  ).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric"
    }
  );

}


/* =========================================================
   SECURITY HELPERS
   ========================================================= */

function escapeHTML(value) {

  return String(value || "")
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


function escapeAttribute(value) {

  return escapeHTML(value);

}


/* =========================================================
   MUSIC
   ========================================================= */

let musicPlaying = false;


musicButton.addEventListener(
  "click",
  async function() {

    if (!backgroundMusic.src) {

      alert(
        "Add your music file or music URL in script.js first."
      );

      return;

    }


    if (musicPlaying) {

      backgroundMusic.pause();

      musicPlaying = false;

      musicButton.textContent =
        "♫";

    }

    else {

      try {

        await backgroundMusic.play();

        musicPlaying = true;

        musicButton.textContent =
          "❚❚";

      }

      catch (error) {

        console.error(error);

      }

    }

  }
);


/* =========================================================
   OPTIONAL MUSIC
   =========================================================

   Example:

   backgroundMusic.src =
     "https://example.com/your-song.mp3";

   IMPORTANT:

   Do not use copyrighted songs unless you have permission
   or the appropriate rights.

   ========================================================= */


/* =========================================================
   CLOSE MODALS WITH ESC
   ========================================================= */

document.addEventListener(
  "keydown",
  function(event) {

    if (event.key !== "Escape") return;


    lightbox.classList.add(
      "hidden"
    );

    memoryModal.classList.add(
      "hidden"
    );

    closeAdminPanel();

  }
);


/* =========================================================
   INITIALIZE
   ========================================================= */

checkLogin();

loadMemories();

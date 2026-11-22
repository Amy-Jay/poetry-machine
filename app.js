const API = "https://api.datamuse.com/words";

const poem = document.getElementById("poem");
const panels = {
  rhyme: {
    input: document.getElementById("rhyme-input"),
    list: document.getElementById("rhyme-results"),
  },
  syn: {
    input: document.getElementById("syn-input"),
    list: document.getElementById("syn-results"),
  },
};

poem.value = localStorage.getItem("poetry-machine.poem") || "";
poem.addEventListener("input", () => {
  localStorage.setItem("poetry-machine.poem", poem.value);
});

function status(list, text) {
  list.innerHTML = "";
  const li = document.createElement("li");
  li.className = "status";
  li.textContent = text;
  list.appendChild(li);
}

function showResults(list, words) {
  list.innerHTML = "";
  if (!words.length) {
    status(list, "no matches");
    return;
  }
  for (const entry of words) {
    const li = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = entry.word;
    li.appendChild(label);
    if (entry.numSyllables != null) {
      const meta = document.createElement("span");
      meta.className = "meta";
      meta.textContent =
        entry.numSyllables + (entry.numSyllables === 1 ? " syllable" : " syllables");
      li.appendChild(meta);
    }
    li.addEventListener("click", () => insertWord(entry.word));
    list.appendChild(li);
  }
}

function insertWord(word) {
  const start = poem.selectionStart ?? poem.value.length;
  const end = poem.selectionEnd ?? start;
  const before = poem.value.slice(0, start);
  const after = poem.value.slice(end);
  const separator = before.length > 0 && !/\s$/.test(before) ? " " : "";
  poem.value = before + separator + word + after;
  const caret = (before + separator + word).length;
  poem.setSelectionRange(caret, caret);
  poem.focus();
  poem.dispatchEvent(new Event("input"));
}

async function fetchWords(params) {
  const url = API + "?" + new URLSearchParams(params);
  const res = await fetch(url);
  if (!res.ok) throw new Error("http " + res.status);
  return res.json();
}

async function runSearch(kind) {
  const { input, list } = panels[kind];
  const word = input.value.trim();
  if (!word) return;
  status(list, "searching…");
  try {
    let words;
    if (kind === "rhyme") {
      words = await fetchWords({ rel_rhyme: word, max: 60 });
      if (!words.length) words = await fetchWords({ rel_nry: word, max: 60 });
    } else {
      words = await fetchWords({ rel_syn: word, max: 60 });
      if (words.length < 5) {
        const related = await fetchWords({ ml: word, max: 60 });
        const seen = new Set(words.map((w) => w.word));
        for (const w of related) {
          if (!seen.has(w.word)) words.push(w);
        }
      }
    }
    showResults(list, words);
  } catch (err) {
    status(list, "could not reach the word service — it needs internet");
  }
}

document.querySelectorAll("form.search").forEach((form) => {
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    runSearch(form.dataset.kind);
  });
});

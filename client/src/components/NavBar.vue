<template>
    <header class="header">
        <div>
            <a href="/" title="Subtitles" aria-label="Subtitles" class="text-slate-300 text-xl">Subtitles</a>
        </div>
        <div></div>
    </header>
</template>

<style scoped>
.header {
    width: 100vw;
    background-color: var(--bg);
    border-bottom: 1px solid var(--secondary);
    height: var(--navbar-height);
    display: flex;
    align-items: center;
}

a {
    padding-left: 35px;
    color: var(--text);
    font-size: large;
    border-bottom: 2px solid var(--primary)
}
</style>

<script lang="ts">
  let { ondismiss }: { ondismiss: () => void } = $props();
</script>

<div class="banner" role="alert">
  <div class="banner-icon">⚠</div>
  <div class="banner-text">
    <strong>Metrics Server unavailable</strong>
    — actual CPU &amp; Memory usage data cannot be displayed.
    Requests and limits are still shown.
  </div>
  <button class="dismiss-btn" onclick={ondismiss} aria-label="Dismiss">✕</button>
</div>

<style>
.banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0.75rem 1.5rem 0;
  padding: 0.6rem 1rem;
  border-radius: 10px;
  background: rgba(245,158,11,0.1);
  border: 1px solid rgba(245,158,11,0.35);
  color: #f59e0b;
  font-size: 0.8rem;
}
.banner-icon { font-size: 1rem; flex-shrink: 0; }
.banner-text { flex: 1; }
.banner-text strong { font-weight: 700; }
.dismiss-btn {
  background: none;
  border: none;
  color: #f59e0b;
  cursor: pointer;
  font-size: 0.75rem;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  opacity: 0.7;
  transition: opacity 0.15s;
}
.dismiss-btn:hover { opacity: 1; }
</style>

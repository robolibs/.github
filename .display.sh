#!/bin/sh
# Shared by every subproject's .env.lua via oslo.source(...). One copy, so the Wayland/NVIDIA
# detection that used to live in ~/.config/direnv/direnvrc's use_nvidia/use_display cannot drift
# between the 19 checkouts that all called it the same way through their .envrc.

_robolibs_use_nvidia() {
    # Presence check first: a trailing `if` with no `else` always exits 0 in
    # POSIX sh regardless of whether the condition matched, so this has to
    # gate everything up front — otherwise every export below (including
    # forcing the GLX/Vulkan vendor to nvidia) fires unconditionally even on
    # a machine with no NVIDIA GPU at all, which is a correctness bug, not
    # just a cosmetic one: it silently routes rendering through a vendor
    # library that doesn't exist there.
    #
    # This checks the PCI bus, not `/proc/driver/nvidia/version` — that proc
    # entry is tied to the kernel module actually being loaded right now,
    # and has been observed to read as briefly absent even while
    # `nvidia-smi`/`lspci` see the card fine moments before and after
    # (module reload / on-demand-load race). The PCI device itself doesn't
    # come and go, so it's the check that can't flap.
    if ! lspci -d ::0300 2>/dev/null | grep -qi nvidia; then
        return 1
    fi

    export __NV_PRIME_RENDER_OFFLOAD=1
    export __NV_PRIME_RENDER_OFFLOAD_PROVIDER=NVIDIA-G0
    export __GLX_VENDOR_LIBRARY_NAME=nvidia
    export __VK_LAYER_NV_optimus=NVIDIA_only

    # Snapshot the running NVIDIA driver version for flakes that need to read
    # it through `builtins.getEnv` under `--impure`. Best-effort: the module
    # may not be loaded at this exact instant even though the card is
    # present, so a miss here isn't a reason to give up on NVIDIA entirely.
    if [ -r /proc/driver/nvidia/version ]; then
        export NVIDIA_VERSION="$(head -n1 /proc/driver/nvidia/version \
            | sed -nE 's/.*  ([0-9.]+)  Release.*/\1/p')"
    fi
}

_robolibs_use_display() {
    export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"

    # Resolve relative Wayland names under XDG_RUNTIME_DIR while also
    # accepting absolute socket paths allowed by the Wayland protocol.
    local wl_socket_path=""
    case "${WL_SOCKET:-}" in
        /*) wl_socket_path="$WL_SOCKET" ;;
        ?*) wl_socket_path="$XDG_RUNTIME_DIR/$WL_SOCKET" ;;
    esac

    # Reject stale display variables inherited through SSH or terminal
    # multiplexers.
    if [ -z "$wl_socket_path" ] || [ ! -S "$wl_socket_path" ]; then
        local display_socket_path=""
        case "${WAYLAND_DISPLAY:-}" in
            /*) display_socket_path="$WAYLAND_DISPLAY" ;;
            ?*) display_socket_path="$XDG_RUNTIME_DIR/$WAYLAND_DISPLAY" ;;
        esac

        if [ -n "$display_socket_path" ] && [ -S "$display_socket_path" ]; then
            export WL_SOCKET="$WAYLAND_DISPLAY"
            wl_socket_path="$display_socket_path"
        else
            # Recover the newest live Waypipe server display, for a shell spawned by a
            # persistent multiplexer daemon that cannot inherit the attaching client's env.
            local waypipe_display
            waypipe_display="$(
                ps -u "$(id -u)" -C waypipe -o pid=,args= 2>/dev/null \
                    | sed -n 's/^[[:space:]]*[0-9][0-9]*[[:space:]].*--display[[:space:]][[:space:]]*\([^[:space:]]*\).*server[[:space:]]*$/\1/p' \
                    | tail -n 1
            )"

            if [ -n "$waypipe_display" ] && [ -S "$XDG_RUNTIME_DIR/$waypipe_display" ]; then
                export WAYLAND_DISPLAY="$waypipe_display"
                export WL_SOCKET="$waypipe_display"
                wl_socket_path="$XDG_RUNTIME_DIR/$waypipe_display"
            else
                export WL_SOCKET="wayland-0"
                wl_socket_path="$XDG_RUNTIME_DIR/$WL_SOCKET"
            fi
        fi
    fi

    # Prefer native Wayland only when the resolved socket exists; otherwise use X11/XWayland.
    # Override before this loads with BACKEND=x11/wayland.
    if [ -z "${BACKEND:-}" ]; then
        if [ -S "$wl_socket_path" ]; then
            export BACKEND="wayland"
        else
            export BACKEND="x11"
        fi
    fi

    export RUN_WITH="${RUN_WITH:-nixVulkan}"

    if [ "$BACKEND" = "wayland" ]; then
        unset WAYLAND_SOCKET
        export WAYLAND_DISPLAY="$WL_SOCKET"
        unset DISPLAY
    else
        unset WAYLAND_DISPLAY
        unset WAYLAND_SOCKET
        export DISPLAY="${DISPLAY:-:1}"
    fi
}

if ! _robolibs_use_nvidia; then
    unset NVIDIA_VERSION
    # `_robolibs_use_display` only fills RUN_WITH in if unset, so setting it
    # here is what actually makes this fallback take effect — previously
    # this branch only printed the message below and RUN_WITH stayed
    # hardcoded to the NVIDIA wrapper further down, which is a slow,
    # wrong (or outright broken) Vulkan path on a machine with no NVIDIA GPU.
    export RUN_WITH="${RUN_WITH:-nixVulkanIntel}"
    echo "robolibs: NVIDIA driver not detected; using nixGLIntel/nixVulkanIntel fallback"
fi
_robolibs_use_display

unset -f _robolibs_use_nvidia _robolibs_use_display

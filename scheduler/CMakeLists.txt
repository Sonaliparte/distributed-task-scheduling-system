cmake_minimum_required(VERSION 3.16)
project(distributed_scheduler LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# ─── Algorithm sources (shared between the CLI binary and the test binary) ───
set(ALGORITHM_SOURCES
    src/scheduler.cpp
    src/round_robin.cpp
    src/least_loaded.cpp
    src/priority_based.cpp
    src/resource_aware.cpp
)

# ─── CLI dispatcher binary ───────────────────────────────────────────────────
# main.cpp contains the JSON stdio dispatcher; it compiles its own main()
# unless SCHEDULER_LIBRARY is defined.
add_executable(scheduler
    src/main.cpp
    ${ALGORITHM_SOURCES}
)
target_include_directories(scheduler PRIVATE include)

# ─── Unit-test binary ────────────────────────────────────────────────────────
# scheduler_tests.cpp defines its own main().
# We define SCHEDULER_LIBRARY so that main.cpp's main() is suppressed when
# it happens to be compiled into this target (it is NOT — but the define
# is set here for safety in case the build system ever merges the sources).
add_executable(scheduler_tests
    tests/scheduler_tests.cpp
    ${ALGORITHM_SOURCES}
)
target_include_directories(scheduler_tests PRIVATE include)
target_compile_definitions(scheduler_tests PRIVATE SCHEDULER_LIBRARY)

# ─── CTest integration ───────────────────────────────────────────────────────
enable_testing()
add_test(NAME scheduler_tests COMMAND scheduler_tests)

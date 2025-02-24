import { extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
    styles: {
        global: {
            "html, body": {
                backgroundColor: "#FFFDF8",
                color: "#171717",
                lineHeight: "tall",
            },
        },
    },
    fonts: {
        heading: `"Space Grotesk", "Courier New", monospace`,
        body: `"IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
    },
    colors: {
        paper: {
            50: "#FFFDF8",
            100: "#F7F3ED",
            200: "#E8E6E1",
            300: "#D3D1CB",
            400: "#171717",
            500: "#0A0A0A",
        },
        accent: {
            100: "#00A3A3", // Teal/cyan 
            200: "#007A7A", // Darker teal for hover
            300: "#005252", // Even darker for active states
        }
    },
    components: {
        Heading: {
            baseStyle: {
                color: "paper.500",
                letterSpacing: "-0.02em",
                textTransform: "uppercase",
            },
        },
        Text: {
            baseStyle: {
                color: "paper.400",
            },
        },
        Button: {
            baseStyle: {
                fontFamily: "heading",
                fontWeight: "600",
                borderRadius: "0",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
            },
            variants: {
                solid: {
                    bg: "accent.100",
                    color: "white",
                    border: "2px solid",
                    borderColor: "paper.500",
                    transform: "translate(-2px, -2px)",
                    boxShadow: "3px 3px 0 black",
                    _hover: {
                        bg: "accent.200",
                        transform: "translate(-1px, -1px)",
                        boxShadow: "2px 2px 0 black",
                    },
                    _active: {
                        bg: "accent.300",
                        transform: "translate(0px, 0px)",
                        boxShadow: "0 0 0 black",
                    },
                },
                outline: {
                    bg: "paper.50",
                    border: "2px solid",
                    borderColor: "paper.400",
                    color: "paper.400",
                    transform: "translate(-2px, -2px)",
                    boxShadow: "3px 3px 0 black",
                    _hover: {
                        bg: "paper.100",
                        transform: "translate(-1px, -1px)",
                        boxShadow: "2px 2px 0 black",
                    },
                },
            },
        },
        Input: {
            variants: {
                outline: {
                    field: {
                        bg: "white",
                        border: "2px solid",
                        borderColor: "paper.400",
                        borderRadius: "0",
                        _hover: {
                            borderColor: "accent.100",
                        },
                        _focus: {
                            borderColor: "accent.100",
                            boxShadow: "3px 3px 0 black",
                        },
                    },
                },
            },
        },
        Card: {
            baseStyle: {
                bg: "white",
                borderRadius: "lg",
                boxShadow: "sm",
                p: 6,
            },
        },
        Toast: {
            baseStyle: {
                borderRadius: "0",
                border: "2px solid",
                borderColor: "paper.500",
                bg: "white",
                boxShadow: "4px 4px 0 black",
                transform: "translate(-2px, -2px)",
                fontFamily: "heading",
                fontSize: "sm",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                "& > *": {  // This targets all direct children
                    borderRadius: "0 !important",
                },
            },
            variants: {
                success: {
                    borderColor: "accent.100",
                    bg: "white",
                    color: "paper.500",
                },
                error: {
                    borderColor: "red.500",
                    bg: "white",
                    color: "paper.500",
                },
                warning: {
                    borderColor: "orange.500",
                    bg: "white",
                    color: "paper.500",
                },
                info: {
                    borderColor: "accent.100",
                    bg: "white",
                    color: "paper.500",
                },
            },
        },
    },
    toast: {
        defaultOptions: {
            position: "top-right",
            duration: 5000,
            isClosable: true,
            variant: "solid",
        },
    },
});

export default theme;